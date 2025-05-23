// const template = document.createElement('template');
// template.innerHTML = /*html*/ `<h1>Top</h1>
// <h2>Center</h2>
// <h3>Bottom</h3>`;
// document.body.appendChild(template);
// //复制template的内容
// const clone = document.importNode(template.content, true);
// document.body.appendChild(clone);
// //添加复制的template的内容
// document.body.appendChild(template.content.cloneNode(true));

class CustomInfoItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;

    shadow.innerHTML = /*html*/ `<div style="line-height:32px;">
    <label id="label" style="color:gray;margin-right:10px">
    </label>
    <span id="value" style="color:blue;"> 
    <slot name="more"></slot>
    </span></div>`;

    const label = shadow.querySelector('#label')!;
    const labelTemplate = document.querySelector('#label-template');

    if (labelTemplate) label.appendChild((labelTemplate as HTMLTemplateElement).content.cloneNode(true));

    const value = shadow.querySelector('#value')!;

    const valueTemplate = document.querySelector('#value-template');
    console.log('🚀 ~ index.ts ~ CustomInfoItem ~ constructor ~ valueTemplate:', valueTemplate);
    if (valueTemplate) {
      value.appendChild((valueTemplate as HTMLTemplateElement).content.cloneNode(true));
    }
  }
}

customElements.define('custom-info-item', CustomInfoItem);

const template = document.createElement('template');
template.id = 'label-template';
template.innerHTML = 'Hello';
document.body.appendChild(template);

const template1 = document.createElement('template');
template1.id = 'value-template';
template1.innerHTML = 'World';
document.body.appendChild(template1);

const infoItem = new CustomInfoItem();
document.body.appendChild(infoItem);

const template2 = document.createElement('template');

template2.innerHTML = '<div slot="more" >HAHAHAHAHA</div>';
infoItem.appendChild(template2);
