class CustomInput extends HTMLElement {
  //开启关联表单元素
  static formAssociated = true;
  internals: ElementInternals;
  input: HTMLInputElement;
  num: HTMLSpanElement;
  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    const shadow = this.shadowRoot!;
    //返回一个ElementInternals对象，允许自定义元素完全参与HTML表单
    this.internals = this.attachInternals();

    shadow.innerHTML = /*html*/ `
  <style>
  *{
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
  }
  input{
  border:none;
  background:transparent;
  padding:0 10px;
  height:30px;
  outline:none;
  display:inline-block;  
  }
  .num{
  display:inline-block;
  font-size:12px;
  color:gray; 
  } 
  .num.error{
    color:red;
  }
  </style>
  <div class="input-wrapper"> 
  <input type='text' maxlength="${this.getAttribute('maxlength') || ''}"  placeholder="${
      this.getAttribute('placeholder') || ''
    }" /> 
  <span class='num'></span>
</div>`;

    this.input = shadow.querySelector('input') as HTMLInputElement;
    this.num = shadow.querySelector('.num') as HTMLSpanElement;
    this.setInputVal(this.getAttribute('value') || '');
    this.input.oninput = () => {
      const v = this.input.value;
      this.updateNum();
      this.internals.setFormValue(v);
      this.validate();
    };
  }
  connectedCallback() {
    //获取关联表单
    console.log(this.internals.form);
  }
  validate() {
    if (this.input.value === '') {
      this.internals.setValidity({ valueMissing: true }, '请输入' + (this.getAttribute('label') || ''));
    } else {
      this.internals.setValidity({});
    }

    this.internals.reportValidity();
  }
  get value() {
    return this.input?.value || '';
  }
  updateNum() {
    if (this.num) {
      const v = this.input.value;
      const len = Number(this.getAttribute('maxLength')) || 0;
      this.num.innerHTML = `${v.length}/${len}`;
      if (v.length <= len) {
        this.num.classList.remove('error');
      } else {
        this.num.classList.add('error');
      }
    }
  }

  setInputVal(v: string) {
    if (this.input) this.input.value = v;
    this.updateNum();
    this.internals.setFormValue(v);
    this.validate();
  }
  set value(v: string) {
    this.setInputVal(v);
  }

  static observedAttributes = ['maxLength', 'placeholder', 'required'];
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case 'required':
        this.input.required = newValue === 'true';
        break;
      case 'placeholder':
        this.input.placeholder = newValue;
        break;
      case 'maxLength':
        const v = Number(newValue);
        if (v > 0) this.input.maxLength = v;
        this.updateNum();
        break;
    }
  }
}
customElements.define('custom-input', CustomInput);
{
  const cinput = new CustomInput();
  cinput.setAttribute('placeholder', '请输入数值');
  cinput.setAttribute('required', 'true');
  cinput.setAttribute('maxLength', '10');
  cinput.value = '1234';
  document.body.appendChild(cinput);
}
