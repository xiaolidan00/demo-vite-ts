class CustomSwitch extends HTMLElement {
  internals: ElementInternals;
  //开启关联表单元素
  static formAssociated = true;
  constructor() {
    super();
    this.internals = this.attachInternals();
    // 创建影子节点
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    //影子根节点
    const shadow = this.shadowRoot!;

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(/*css*/ ` *{
        box-sizing:border-box;
      }
  :host {
    display: inline-flex;
    height:20px;
    width:40px;
    background:white;   
    border-radius:10px;
    overflow:hidden;      
     padding:2px;
     background:gray;
  }
  :host::before {
    display:flex;
    align-items:center;
    justify-content:flex-start;
    height:16px;
    width:16px;
    border-radius:50%;
    content: "";  
    background:white;
  }
  :host(:state(checked)){
  background:dodgerblue;
  justify-content:flex-end;
  transition:all 0.5s ease;
  } `);
    shadow.adoptedStyleSheets = [sheet];
    this.addEventListener('click', this.onClick.bind(this));
  }
  onClick() {
    this.checked = !this.checked;
  }
  disconnectedCallback() {
    this.removeEventListener('click', this.onClick.bind(this));
  }
  get checked() {
    return this.internals.states.has('checked');
  }

  set checked(flag) {
    //设置状态值
    if (flag) {
      this.internals.states.add('checked');
      this.internals.setFormValue('checked', 'checked');
    } else {
      this.internals.states.delete('checked');
      this.internals.setFormValue('checked', '');
    }
    console.log('🚀 ~ CustomSwitch ~ setchecked ~ this.internals:', this.internals);
  }

  //判断状态语法是否可用
  static isStateSyntaxSupported() {
    return CSS.supports('selector(:state(checked))');
  }
}

customElements.define('custom-switch', CustomSwitch);
const switchEl = new CustomSwitch();
document.body.appendChild(switchEl);
