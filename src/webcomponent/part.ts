class TabsElement extends HTMLElement {
  container: HTMLDivElement;
  constructor() {
    super();
    // 创建影子根
    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
        * {
          box-sizing: border-box;
        }
        :host{
      display:block;  
       height:32px;
     }
     .tab-container{
      overflow:auto hidden; 
      height:32px;
      color:gray;
      font-size:14px;
     }
     :host::part(tab){
  display:inline-flex;
  padding:0 20px;
  cursor:pointer;
  align-items:center;
  justify-content:center;
  height:100%;
  border-bottom:solid 2px transparent;
     }
     :host::part(active){
  border-bottom:solid 2px blue;
  font-weight:bold;
  color:blue;
     }`);
    shadow.adoptedStyleSheets = [sheet];

    this.container = document.createElement('div');
    this.container.className = 'tab-container';
    shadow.appendChild(this.container);
    this.render();
  }
  connectedCallback() {}

  static observedAttributes = ['active', 'tabs'];

  render() {
    const active = Number(this.getAttribute('active') || 0);
    let tabs: string[] = [];
    try {
      tabs = JSON.parse(this.getAttribute('tabs') || '[]');
    } catch (error) {}
    if (this.container)
      this.container.innerHTML = tabs
        .map((it, i) => `<div part="tab ${i == active ? 'active' : ''}">${it}</div>`)
        .join('');
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log('🚀 ~ index.ts ~ Tooltip ~ attributeChangedCallback ~ newValue:', newValue);
    this.render();
  }
}
customElements.define('tabs-element', TabsElement);
{
  const content = document.createElement('div');
  content.innerHTML = `<tabs-element tabs='${JSON.stringify(['tab1', 'tab2', 'tab3'])}' active="2" ></tabs-element>`;
  document.body.appendChild(content);
}
