class CustomInput extends HTMLElement {
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

    shadow.innerHTML = `
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
  border-color:red;
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
  <input type='text' maxlength="${this.getAttribute('maxlength') || ''}"  /> 
  <span class='num'></span>
   </div>
 `;
    this.label = shadow.querySelector('label') as HTMLLabelElement;
    this.input = shadow.querySelector('input') as HTMLInputElement;
    this.num = shadow.querySelector('.num') as HTMLSpanElement;

    this.input.oninput = () => {
      const v = this.input.value;
      if (this.num) this.num.innerHTML = v.length + '';
      this.internals.setFormValue(v);
      this.validate();
    };
  }
  validate() {
    const validityState = this.internals.validity;

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

  static observedAttributes = ['maxlength', 'required', 'placeholder', 'label'];
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log('🚀 ~ index.ts ~ CustomInput ~ attributeChangedCallback ~ name:', name);
    if (name === 'required') {
      if (newValue === 'true') {
        this.internals.setValidity({ valueMissing: true }, '请输入');
      } else {
        this.internals.setValidity({});
      }
    } else if (name == 'label') {
      this.label.innerHTML = newValue;
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
const inpuut = document.createElement('input');
inpuut.required;
