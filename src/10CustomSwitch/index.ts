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
  onClick(e: Event) {
    //切换开关状态
    this.checked = !this.checked;

    //分发事件
    //@ts-ignore
    const event = new Event('change', { detail: { checked: this.checked } });
    this.dispatchEvent(event);
  }
  disconnectedCallback() {
    this.removeEventListener('click', this.onClick.bind(this));
  }
  //设置表单字段名
  set name(v: string) {
    this.setAttribute('name', v);
  }
  get name() {
    return this.getAttribute('name') || '';
  }
  get checked() {
    //@ts-ignore
    return this.internals.states.has('checked');
  }

  set checked(flag) {
    //设置状态值
    if (flag) {
      //@ts-ignore
      this.internals.states.add('checked');
      this.internals.setFormValue('on');
    } else {
      //@ts-ignore
      this.internals.states.delete('checked');
      this.internals.setFormValue('off');
    }
  }

  //判断状态语法是否可用
  static isStateSyntaxSupported() {
    return CSS.supports('selector(:state(checked))');
  }
}

customElements.define('custom-switch', CustomSwitch);
{
  const form = document.createElement('form');
  document.body.appendChild(form);

  const switchEl = new CustomSwitch();
  switchEl.name = 'Hello';
  switchEl.checked = true;

  form.appendChild(switchEl);

  //监听change事件
  switchEl.addEventListener('change', (e: Event) => {
    console.log('🚀 ~ addEventListener ~ e:', e);
    //获取表单数据
    const formData = new FormData(form);
    //获取表单值
    console.log('🚀 ~ formData:', formData.get('Hello'));
    //表单校验结果，是否通过校验
    console.log('🚀 ~ Validity:', form.checkValidity());
  });
}
