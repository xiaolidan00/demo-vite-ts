class CustomTitle extends HTMLElement {
  constructor() {
    super();
    // 创建影子节点
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    //影子根节点
    const shadow = this.shadowRoot!;

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(/*css*/ `
        * {
          box-sizing: border-box;
        }
        :host{
          font-size:18px;
          font-weight:600;
          display:block;
          line-height:40px;
          padding:0 20px;
          color:#505050;
        }
        
        :host::after{
        display:inline-block;
        content:'>'
        }
        :host(.border) {
          border-left:solid 3px green;
        }
        :host([required="true"]){
          background:yellow;
        }
        :host(#first){
        color:orange;
        }         
        :host(:hover){
          color:red;
        }
        :host-context(p){
             text-decoration: underline;
        }
         :host-context(p:hover){ 
                font-size:30px;
        }
        `);
    shadow.adoptedStyleSheets = [sheet];

    if (this.childNodes?.length) {
      shadow.append(...Array.from(this.childNodes));
    }
  }
}
customElements.define('custom-title', CustomTitle);

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-title  >The Title</custom-title>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-title  class="border">The Title</custom-title>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-title  required="true">The Title</custom-title>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-title  id="first">The Title</custom-title>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-title  id="first" class="border" required="true">The Title</custom-title>';
  document.body.appendChild(content);
}

{
  const content = document.createElement('p');
  content.innerHTML = '<custom-title >The Title</custom-title>';
  document.body.appendChild(content);
}
