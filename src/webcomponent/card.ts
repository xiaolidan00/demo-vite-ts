class CustomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;
    shadow.innerHTML = /*html*/ `<div style="display:inline-block;border:solid 1px rgba(0,0,0,0.1);padding:20px;box-shadow:0 0 10px #ccc">
   <slot></slot> </div>`;
  }
}
customElements.define('custom-card', CustomCard);

{
  const card = new CustomCard();
  card.innerHTML = 'Card Card';
  document.body.appendChild(card);
}
