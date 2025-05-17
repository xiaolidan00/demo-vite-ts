// class HelloWorldElement extends HTMLElement {
class HelloWorldElement extends HTMLParagraphElement {
  constructor() {
    super();
    //可以做一些初始化操作
    this.style.fontWeight = 'bold';

    this.style.display = 'block';
  }
  connectedCallback() {
    console.log('自定义元素添加至页面。');
  }

  disconnectedCallback() {
    console.log('自定义元素从页面中移除。');
  }

  adoptedCallback() {
    console.log('自定义元素移动至新页面。');
  }
  // static get observedAttributes() {
  //   return ["color", "size"];
  // }

  //需要监听的属性名
  static observedAttributes = ['color', 'size'];
  //属性值改变 不论是否添加到页面都会触发 初始化和属性增删和值变化都会被监听到,类似于vue watch函数immediate开启的时候
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    console.log(`属性 ${name} 已变更。`);
    switch (name) {
      case 'color':
        this.style.color = newValue;
        break;

      case 'size':
        this.style.fontSize = newValue === 'small' ? '12px' : newValue === 'large' ? '20px' : '16px';
        break;
    }
  }
}
//判断组件是否被注册
if (!window.customElements.get('hello-world')) {
  //未注册则注册组件 组件注册名称必须小写字母带-
  //   window.customElements.define('hello-world', HelloWorldElement);
  //继承p元素
  customElements.define('hello-world', HelloWorldElement, { extends: 'p' });
}
{
  const content = document.createElement('div');
  content.innerHTML = '<p is="hello-world" color="blue" size="large">PPPPP</p>';
  document.body.appendChild(content);
}

const hello = new HelloWorldElement();
// const hello = document.createElement('hello-world');
hello.innerHTML = 'Hello World';
//错误赋值方式
// hello.size = 'large';
// hello.color = 'blue';
//正确赋值方式
hello.setAttribute('size', 'large');
hello.setAttribute('color', 'blue');
document.body.appendChild(hello);

//获取自定义组件注册的组件名
console.log(customElements.getName(HelloWorldElement)); // "hello-world";
