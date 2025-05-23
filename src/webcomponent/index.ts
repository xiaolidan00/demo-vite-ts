class CustomLayout extends HTMLElement {
  tempslot?: HTMLSlotElement;
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const shadow = this.shadowRoot!;

    shadow.innerHTML = /*html*/ `
      <style>
      :host{
      display:flex;
      } 
      :host>div{
      flex:1;
      }
      .left{
      text-align:left;
      }
      .center{
      text-align:center;
      }
      .right{
      text-align:right;
      } 
      
      ::slotted(*){
      font-weight:bold;
      }
      ::slotted(h1){
      background:pink;     
      }
      ::slotted(.border){
        color:green
      }
      </style>
      <div class='left'><slot name='left'></slot></div>
      <div class='center'><slot name='center'></slot></div>
      <div class='right'><slot name='right'></slot></div> `;

    this.addEventListener('click', this.addSlot.bind(this));
  }
  onSlotChange(ev: Event) {
    // console.log('🚀 ~ index.ts ~ CustomLayout ~ onSlotChange ~ ev:', ev);
  }
  addSlot() {
    //判断<slot>是否被添加
    if (!this.tempslot) {
      const shadow = this.shadowRoot!;
      //动态添加<slot>
      const tempslot = document.createElement('slot');
      tempslot.name = 'tempSlot1';
      this.tempslot = tempslot;
      shadow.appendChild(tempslot);
      //监听<slot>属性的变化
      tempslot.addEventListener('slotchange', this.onSlotChange.bind(this));
      console.log(this.tempslot!.assignedElements().map((el) => el.outerHTML));
      console.log(this.tempslot!.assign());
      console.log(this.tempslot!.assignedNodes());
    } else {
      //改变<slot>的name属性
      this.tempslot.name = this.tempslot.name == 'tempSlot' ? 'tempSlot1' : 'tempSlot';
    }
  }
}
customElements.define('custom-layout', CustomLayout);
// const leftSlot = document.createElement('slot');
// leftSlot.name = 'left';
// shadow.appendChild(leftSlot);

// const centerSlot = document.createElement('slot');
// centerSlot.name = 'center';
// shadow.appendChild(centerSlot);

// const rightSlot = document.createElement('slot');
// rightSlot.name = 'right';
// shadow.appendChild(rightSlot);

const content = document.createElement('div');
content.innerHTML = /*html*/ `
<style>
.border{
  display:inline-block;
  border:solid 1px blue;
  padding:10px;
}
#centerBody{
  background:yellow;
}
</style>
<custom-layout>
    <span slot='left' class="border">Left</span>
    <div slot='center' id='centerBody'>Center</div>
    <h1 slot='right'>Right</h1>
    <h1 slot='tempSlot1' style="color:red">tempSlot1<strong>HAHAHA</strong></h1> 
     <h1 slot='tempSlot' style="color:orange">Hello</h1>
</custom-layout>`;
document.body.appendChild(content);
