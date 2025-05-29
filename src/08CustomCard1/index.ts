class CustomCard1 extends HTMLElement {
  titleSlot: HTMLSlotElement;
  bodySlot: HTMLSlotElement;
  constructor() {
    super();
    //slotAssignment定义slot手动配置
    this.attachShadow({ mode: 'open', slotAssignment: 'manual' });
    const shadow = this.shadowRoot!;
    shadow.innerHTML = /*html*/ `<div style="display:inline-block;border:solid 1px rgba(0,0,0,0.1);padding:20px;box-shadow:0 0 10px #ccc">
   <slot></slot> 
   <div style="background:yellow">
      <slot></slot>
   </div>  
   </div>`;

    const slots = shadow.querySelectorAll('slot')!;
    this.titleSlot = slots[0];
    this.bodySlot = slots[1];
  }
}
customElements.define('custom-card1', CustomCard1);

const card = new CustomCard1();

document.body.appendChild(card);

const title = document.createElement('h1');
title.innerHTML = 'TITLE';
//添加到自定义元素内
card.appendChild(title);
//插槽手动设置渲染元素
card.titleSlot.assign(title);

const cardBody = document.createElement('div');
cardBody.innerHTML = 'CARD BODY';
//添加到自定义元素内
card.appendChild(cardBody);
//插槽手动设置渲染元素
card.bodySlot.assign(cardBody);
