class CustomInput extends HTMLElement {
  //开启关联表单元素
  static formAssociated = true;
  internals: ElementInternals;
  input: HTMLInputElement;
  num: HTMLSpanElement;
  tip: HTMLDivElement;
  wrap: HTMLDivElement;
  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    const shadow = this.shadowRoot!;
    //返回一个ElementInternals对象，允许自定义元素完全参与HTML表单
    this.internals = this.attachInternals();

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(/*css*/ `*{
  box-sizing:border-box;
  }
  :host{
  display:inline-block;
  }
  .input-wrapper{
  display:inline-flex; 
  border-radius:4px;
  height:32px;
  border:solid 1px gray;
  align-items:center;
  padding:0 10px;
  }
   .input-wrapper.error{
     border:solid 1px red;
   }
   .input-wrapper.error .num{
    color:red;
  }
  input{
  border:none;
  background:transparent;  
  height:30px;
  outline:none;
  display:inline-block;  
  }
  .num{
  display:inline-block;
  font-size:12px;
  color:gray; 
  }
  .error-tip{
    padding:5px;
    font-size:12px;
    color:red;
  }  `);
    shadow.adoptedStyleSheets = [sheet];
    shadow.innerHTML = /*html*/ `<div class="input-wrapper"> 
  <input type='text' placeholder="${this.getAttribute('placeholder') || ''}" /> 
  <span class='num'></span>
</div>
<div class="error-tip"></div>`;
    this.wrap = shadow.querySelector('.input-wrapper') as HTMLDivElement;
    this.input = shadow.querySelector('input') as HTMLInputElement;
    this.num = shadow.querySelector('.num') as HTMLSpanElement;
    this.tip = shadow.querySelector('.error-tip') as HTMLDivElement;
    //设置输入值
    this.setInputVal(this.getAttribute('value') || '');
    //输入事件监听
    this.input.addEventListener('input', () => {;,
      console.log(this.internals.form);
      const v = this.input.value;
      //文本长度
      this.updateNum();
      //设置表单值
      this.internals.setFormValue(v);
      //表单验证
      this.validate();
    });
  }
  //设置输入值
  setInputVal(v: string) {
    if (this.input) this.input.value = v;
    this.updateNum();
    this.internals.setFormValue(v);
    this.validate();
  }
  set value(v: string) {
    this.setInputVal(v);
  }
  get value() {
    return this.input?.value || '';
  }
  connectedCallback() {
    //获取关联表单
    // console.log(this.internals.form);
  }
  disconnectedCallback() {
    this.input.oninput = null;
  }
  //表单自带验证
  validate() {
    if (this.input.value.length > Number(this.getAttribute('maxlength'))) {
      const text = '最多输入10个字符';
      this.tip.innerHTML = text;
      this.tip.style.display = 'block';
      this.internals.setValidity({ tooLong: true }, text, this.tip);
    } else if (this.getAttribute('required') === 'true' && this.input.value === '') {
      const text = this.getAttribute('placeholder') || '请输入';
      this.tip.innerHTML = text;
      this.tip.style.display = 'block';
      this.internals.setValidity({ valueMissing: true }, text, this.tip);
    } else {
      this.internals.setValidity({});
      this.tip.style.display = 'none';
    }
    this.internals.reportValidity();
    // console.log('🚀 ~ CustomInput ~ validate ~ this.internals:', this.internals);
  }

  updateNum() {
    const v = this.input.value;
    const len = Number(this.getAttribute('maxlength')) || 0;
    this.num.innerHTML = `${v.length}/${len}`;
    //超过长度则显示错误样式
    if (v.length <= len) {
      this.wrap.classList.remove('error');
    } else {
      this.wrap.classList.add('error');
    }
  }
  static observedAttributes = ['maxlength', 'placeholder', 'required'];
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case 'placeholder':
        this.input.placeholder = newValue;
        break;
      case 'maxlength':
        //文本长度
        this.updateNum();
        break;
      case 'required':
        //表单验证
        this.validate();
        break;
    }
  }
}
customElements.define('custom-input', CustomInput);

const cinput = new CustomInput();
cinput.setAttribute('placeholder', '请输入数值');
cinput.setAttribute('required', 'true');
cinput.setAttribute('maxlength', '10');
cinput.value = '1234';
document.body.appendChild(cinput);

const form = document.createElement('form');
form.appendChild(cinput);
document.body.appendChild(form);
