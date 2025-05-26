class CustomCheckbox extends HTMLElement {
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
    display: block;
    height:20px;
    width:20px;
    background:white;   
    border-radius:3px;
    overflow:hidden; 
     border:solid 1px black;
  }
  :host::before {
    display:flex;
    align-items:center;
    justify-content:center;
    height:100%;
    width:100%;
    content: "";    
  }
  :host(:state(checked)){
  background:dodgerblue;
  border:solid 1px dodgerblue;
  }
  :host(:state(checked))::before {
    content: "V";
    color:white;
    font-size:14px;   
  }`);
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
  }

  //判断状态语法是否可用
  static isStateSyntaxSupported() {
    return CSS.supports('selector(:state(checked))');
  }
}

customElements.define('custom-checkbox', CustomCheckbox);
const checkbox = new CustomCheckbox();
document.body.appendChild(checkbox);
