class CustomTabs extends HTMLElement {
  container: HTMLDivElement;
  isChangeTabs = false;
  constructor() {
    super();
    // 创建影子根
    this.attachShadow({ mode: 'open' });

    const shadow = this.shadowRoot!;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(/*css*/ `
       * {
  box-sizing: border-box;
}
:host {
  display: block;
  height: 40px;
}
.tab-container {
  overflow: auto hidden;
  height: 100%; 
  font-size: 14px;
  color: gray;
}

:host::part(tab) {
  display: inline-flex;
  padding: 0 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  height: 100%;   
}
:host::part(active) {
  transition: all ease 0.5s;
  background: rgba(0, 0, 255, 0.3);
  font-weight: bold;
  color: blue;
}
`);
    shadow.adoptedStyleSheets = [sheet];

    this.container = document.createElement('div');
    this.container.className = 'tab-container';
    shadow.appendChild(this.container);
    this.container.addEventListener('click', this.onClickTab.bind(this));
    this.render();
  }
  //点击切换tab，触发事件
  onClickTab(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (target.getAttribute('idx')) {
      //更新tab
      const newIdx = target.getAttribute('idx') || '0';
      //设置active属性，触发属性变化监听attributeChangedCallback
      this.setAttribute('active', newIdx);
      //创建自定义事件
      const event = new CustomEvent('change', { detail: newIdx });
      //分派事件
      this.dispatchEvent(event);
    }
  }
  //从页面移除元素
  disconnectedCallback() {
    this.container.removeEventListener('click', this.onClickTab.bind(this));
  }

  //渲染tab
  render(newIdx?: number) {
    const active = newIdx !== undefined ? newIdx : Number(this.getAttribute('active') || 0);

    if (this.container) {
      //tab改变重新渲染
      if (this.isChangeTabs) {
        let tabs: string[] = [];
        try {
          tabs = JSON.parse(this.getAttribute('tabs') || '[]');
        } catch (error) {}
        this.container.innerHTML = tabs
          .map((it, i) => `<div part="tab ${i == active ? 'active' : ''}" idx="${i}">${it}</div>`)
          .join('');
        this.isChangeTabs = false;
      } else {
        //active变化改变激活tab
        const beforeActive = this.container.querySelector('[part="tab active"]');
        if (beforeActive) {
          beforeActive.part = 'tab';
        }

        const child = this.container.children[active];
        if (child) {
          child.part = 'tab active';
        }
      }
    }
  }
  //监听属性值变化
  static observedAttributes = ['active', 'tabs'];
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name == 'tabs') {
      this.isChangeTabs = true;
    }
    this.render();
  }
}
customElements.define('custom-tabs', CustomTabs);
// {
//   const content = document.createElement('div');
//   content.innerHTML = `<custom-tabs tabs='${JSON.stringify(['语文', '数学', '英语'])}' active="2" ></custom-tabs>`;
//   document.body.appendChild(content);
// }

const tabs = new CustomTabs();
tabs.setAttribute('tabs', JSON.stringify(['语文', '数学', '英语']));
tabs.setAttribute('active', '1');
document.body.appendChild(tabs);
tabs.addEventListener('change', (ev: Event) => {
  const target = ev.target as HTMLElement;
  const event = ev as CustomEvent;
  console.log('🚀 ~ index.ts ~ tabs.addEventListener:', ev, event.detail, target.getAttribute('active'));
});
