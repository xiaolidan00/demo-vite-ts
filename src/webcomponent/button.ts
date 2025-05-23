const globalStyle = document.createElement('style');
globalStyle.innerHTML = /*css*/ `
custom-button{
  display:inline-flex;
  align-items:center;
  justify-content:center;
border-radius:4px;
height:40px;
line-height:40px;
background:blue;
color:white;
padding:0 10px;
cursor:pointer;
}
custom-button:hover{
  background: rgb(3, 169, 244);
}
custom-button .more{
  border-radius:50%;
    display:inline-flex;
  align-items:center;
  justify-content:center;
  height:20px;
  width:20px;
  background:rgba(255,255,255,0.5);
}
`;
document.body.appendChild(globalStyle);
class CustomButton extends HTMLElement {
  constructor() {
    super();
    // 创建影子节点
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    //影子根节点
    const shadow = this.shadowRoot!;

    if (this.childNodes?.length) {
      shadow.append(...Array.from(this.childNodes));
    }
    const scopedStyle = document.createElement('style');
    scopedStyle.innerHTML = `.more{
      border-radius:50%;
        display:inline-flex;
      align-items:center;
      justify-content:center;
      height:20px;
      width:20px;
      color:blue;
      background:white;
    }`;
    shadow.appendChild(scopedStyle);

    // //样式优先级更高
    const sheet = new CSSStyleSheet();
    //替换更新成最新样式，只保留一条
    // sheet.replaceSync(`.more{
    //   background:gray;
    //   color:white;
    //   }`);
    sheet.insertRule(`.more{
       background:red;
      color:blue;
      }`);

    sheet.insertRule(`.more{
       background:green;
      color:gray;
      }`);
    shadow.adoptedStyleSheets = [sheet];

    sheet.replaceSync(`.more{
      background:gray;
      color:white;
      }`);
    sheet.insertRule(`.more{
       background:pink;
      color:gray;
      }`);

    sheet.insertRule(`.more{
       background:black;
      color:white;
      }`);
    sheet.replaceSync(`.more{
      background:orange;
      color:yellow;
      }`);
    console.log('🚀 ~ index.ts ~ CustomButton ~ constructor ~ sheet:', sheet);
    const more = document.createElement('span');
    more.className = 'more';
    more.innerHTML = 'i';
    shadow.appendChild(more);
  }
}

customElements.define('custom-button', CustomButton);

{
  const content = document.createElement('div');
  content.innerHTML = '<custom-button  >详情</custom-button>';
  document.body.appendChild(content);
}

// // 创建影子根
// this.attachShadow({ mode: 'open', delegatesFocus: true });
// //影子根节点
// const shadow = this.shadowRoot!;

// //将自定义元素的子节点移到shadowRoot内
// if (this.childNodes?.length) {
//   shadow.append(...Array.from(this.childNodes));
// }
