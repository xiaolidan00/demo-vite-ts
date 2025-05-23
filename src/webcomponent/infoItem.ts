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
    // const template = document.createElement('template');
    // template.shadowRootMode = 'open';
    // this.appendChild(template);
    // template.innerHTML = /*html*/ `<div style="line-height:32px;">
    // <label style="color:gray;margin-right:10px">
    // <slot name="label"></slot>：
    // </label>
    // <span style="color:blue;">
    // <slot name="value"></slot>
    // </span></div>`;

    this.innerHTML = /*html*/ `<template shadowrootmode="open">
   <div style="line-height:32px;">
    <label style="color:gray;margin-right:10px">
    <slot name="label"></slot>：
    </label>
    <span style="color:blue;">
    <slot name="value"></slot>
    </span></div>
    </template>`;
  }
}

customElements.define('custom-info-item', CustomInfoItem);

// const infoItem = new CustomInfoItem();
// document.body.appendChild(infoItem);

// const label = document.createElement('span');
// label.slot = 'label';
// label.innerHTML = '国庆日期';
// infoItem.appendChild(label);

// const value = document.createElement('span');
// value.slot = 'value';
// value.innerHTML = '十月一号';
// infoItem.appendChild(value);
