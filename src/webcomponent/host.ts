const style = /*css*/ `:host> .tooltip{
    display:none;
    padding:10px;
    line-height:20px;
    border-radius:4px;
     background:black;
     color:white;
     position:absolute;         
 }
 /**宿主样式 */
 :host{ 
    display:inline-block;
    margin:10px;       
    background:yellow;        
 }
 /**父级是div且悬浮在上面时候，.tooltip显示 */
 :host-context(div){
    cursor:pointer;
 }
 :host-context(div:hover)>.tooltip{
    display:inline-block;
    margin-top:20px;
 }
   /**宿主选择器 */
 :host(.red){
    color:red;
 }`;
const style1 = /*css*/ `
.tooltip{
  background:yellow;
}`;
class Tooltip extends HTMLElement {
  child: HTMLDivElement;

  constructor() {
    super();

    // 创建影子根 https://developer.mozilla.org/zh-CN/docs/Web/API/Element/attachShadow
    //mode:open shadow root 元素可以从 js 外部访问根节点
    //mode:closed 拒绝从 js 外部访问关闭的 shadow root 节点
    /**
     * delegatesFocus 焦点委托 shadowRoot内元素不可聚焦，则委托到父级可聚焦的元素，比如富文本编辑的时候，点击内部自定义元素，则会聚焦到父级富文本编辑器
一个布尔值，当设置为 true 时，指定减轻自定义元素的聚焦性能问题行为。 当 shadow DOM 中不可聚焦的部分被点击时，让第一个可聚焦的部分成为焦点，并且 shadow host（影子主机）将提供所有可用的 :focus 样式。
     */
    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;

    const text = this.getAttribute('text');
    shadow.innerHTML = /*html*/ `
     <style>
       ${style}
     </style>
       <div class="tooltip">${text || ''}</div>`;

    const div = document.querySelector('.tooltip') as HTMLDivElement;
    this.child = div;
    if (this.childNodes?.length) {
      shadow.append(...Array.from(this.childNodes));
    }

    //样式优先级更高
    const sheet = new CSSStyleSheet();
    //替换更新成最新样式，只保留一条
    sheet.replaceSync(style);
    shadow.adoptedStyleSheets = [sheet];

    //前面插入样式规则 规则会累积，元素样式设置可以重复
    sheet.insertRule('.tooltip{ color: blue; }');
    //删除样式规则
    sheet.deleteRule(0);
  }
  connectedCallback() {}

  static observedAttributes = ['text'];

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log('🚀 ~ index.ts ~ Tooltip ~ attributeChangedCallback ~ newValue:', newValue);
    if (this.child) this.child.innerHTML = newValue;
  }
}
customElements.define('tool-tip', Tooltip);
{
  const content = document.createElement('div');
  content.innerHTML = '<tool-tip text="hello-world1"  >hahhahaha<strong>HEIEHIEHI</strong></tool-tip>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('div');
  content.innerHTML = '<tool-tip text="hello-world2" class="red">hahhahaha<strong>HEIEHIEHI</strong></tool-tip>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('h1');
  content.innerHTML = '<tool-tip text="hello-world3"  >no-tooltip</tool-tip>';
  document.body.appendChild(content);
}
