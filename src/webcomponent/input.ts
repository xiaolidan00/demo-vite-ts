class CustomInput extends HTMLElement {
  //表单元素
  static formAssociated = true;
  internals: ElementInternals;
  input: HTMLInputElement;
  num: HTMLSpanElement;
  label: HTMLLabelElement;
  constructor() {
    super();
    this.internals = this.attachInternals();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    const shadow = this.shadowRoot!;

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
  background:white;
  
  border-radius:4px;
  height:32px;
  border:solid 1px gray;
  align-items:center;
  }
  .input-wrapper:focus{
  border:solid 1px blue;
  }
  input{
  border:none;
  background:transparent;
  padding-left:10px;
  height:30px;
  outline:none;
  display:inline-block;
  width:200px;
  }
  .num{
  display:inline-block;
  font-size:12px;
  color:gray;
  width:20px;
  } 
  :host:invalid .input-wrapper{  
  display:inline-block;
  content:'不能为空';
  position:absolute;
  z-index:2;
  } 
  :host([required="true"]) label::before{
display:inline-block;
content:'*';
color:red;
font-size:14px;
  }
  </style>  
  <label>${this.getAttribute('label') || ''}</label>
  <div class="input-wrapper"> 
  <input type='text' maxlength="${this.getAttribute('maxlength') || ''}"  placeholder="${
      this.getAttribute('placeholder') || ''
    }" /> 
  <span class='num'></span>
   </div>
 `;
    this.label = shadow.querySelector('label') as HTMLLabelElement;
    this.input = shadow.querySelector('input') as HTMLInputElement;
    this.num = shadow.querySelector('.num') as HTMLSpanElement;
    this.setInputVal(this.getAttribute('value') || '');
    this.input.oninput = () => {
      const v = this.input.value;
      if (this.num) this.num.innerHTML = v.length + '';
      this.internals.setFormValue(v);
      this.validate();
    };
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

  setInputVal(v: string) {
    if (this.input) this.input.value = v;
    if (this.num) this.num.innerHTML = v.length + '';
    this.internals.setFormValue(v);
    this.validate();
  }
  set value(v: string) {
    this.setInputVal(v);
  }

  static observedAttributes = ['maxLength', 'label', 'placeholder', 'required'];
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case 'label':
        this.label.innerHTML = newValue;
        break;
      case 'required':
        this.input.required = newValue === 'true';
        break;
      case 'placeholder':
        this.input.placeholder = newValue;
        break;
      case 'maxLength':
        const v = Number(newValue);
        if (v > 0) this.input.maxLength = v;
        break;
    }
  }
}
customElements.define('custom-input', CustomInput);
{
  const cinput = new CustomInput();
  cinput.setAttribute('label', '数值');
  cinput.setAttribute('required', 'true');
  cinput.setAttribute('maxlength', 'true');
  cinput.value = '1234';
  document.body.appendChild(cinput);
}
