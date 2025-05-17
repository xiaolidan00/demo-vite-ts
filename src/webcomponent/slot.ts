class LayoutElement extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;
    shadow.innerHTML = `
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
      ::slotted(span){
      background:yellow;
      }
      ::slotted(.line){
      text-decoration: underline;
      }
      </style>
      <div class='left'><slot name='left'></slot></div>
      <div class='center'><slot name='center'></slot></div>
      <div class='right'><slot name='right'></slot></div>`;
  }
}
customElements.define('layout-element', LayoutElement);
{
  const content = document.createElement('h1');
  content.innerHTML = `<layout-element>
    <span slot='left'>Left</span>
    <div slot='center' class='line'>Center</div>
    <p slot='right'>Right</p>
    </layout-element>`;
  document.body.appendChild(content);
}
