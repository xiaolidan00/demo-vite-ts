import { debounce } from '../map/util';
import BaseResize from '../utils/BaseResize';
import './index.scss';
type PopperBaseConfig = {
  fitInputWidth?: boolean;
  disabled?: boolean;

  hoverCb?: Function;
  showHideCb?: Function;
  changeCb?: Function;
};
class PopperBase {
  resizeUtil: BaseResize;
  el: HTMLElement;
  container: HTMLElement;
  isShow: boolean = false;
  resize: Function;
  isRendered: boolean = false;
  closeTimeout: any;
  config: PopperBaseConfig;
  iconClass = '';
  isHover: boolean = false;
  constructor(el: HTMLElement, container: HTMLElement, config: PopperBaseConfig = {}) {
    this.config = config;
    this.container = container;
    this.el = el;
    container.style.position = 'fixed';
    container.style.zIndex = '3000';
    container.style.display = 'none';
    document.addEventListener('click', this.onBody.bind(this));

    container.addEventListener('mouseenter', this.onShow.bind(this));
    container.addEventListener('mouseover', this.onShow.bind(this));

    el.addEventListener('click', this.onShow.bind(this));

    el.addEventListener('mouseenter', this.onEnter.bind(this));
    el.addEventListener('mouseleave', this.onLeave.bind(this));
    this.resize = debounce(this.onResize.bind(this), 100);
    this.resizeUtil = new BaseResize(el, this.resize.bind(this));
  }
  onEnter() {
    this.isHover = true;
    if (this.config.hoverCb) {
      this.config.hoverCb(this.isHover);
    }
  }
  onLeave() {
    this.isHover = false;
    if (this.config.hoverCb) {
      this.config.hoverCb(this.isHover);
    }
  }
  showHideAction() {
    this.container.style.display = this.isShow ? 'block' : 'none';

    if (this.config.showHideCb) {
      this.config.showHideCb(this.isShow);
    }
  }
  onResize() {
    if (!this.isShow) return;
    const input = this.el;

    const dom = this.container;

    if (dom && input) {
      if (this.config.fitInputWidth) dom.style.width = input.offsetWidth + 'px';
      const rect = input.getBoundingClientRect();
      const rect1 = dom.getBoundingClientRect();
      let left = rect.left;
      if (left + rect1.width > window.innerWidth) {
        left = window.innerWidth - rect1.width;
      }
      let top = rect.top + rect.height;
      if (top + rect1.height > window.innerHeight) {
        top = window.innerHeight - rect1.height;
      }
      dom.style.left = left + 'px';
      dom.style.top = top + 'px';
    }
  }
  onShow() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
    if (this.config.disabled) return;

    if (this.isShow) {
      return;
    }
    this.isShow = true;
    this.showHideAction();
    if (!this.isRendered) {
      document.body.appendChild(this.container);
      this.isRendered = true;
    }
    this.resize();
  }
  toggle() {
    if (this.isShow) {
      this.isShow = false;
      this.showHideAction();
    } else this.onShow();
  }
  onBody(ev: MouseEvent) {
    let target = ev.target as HTMLElement;

    while (target.parentElement) {
      if (target === this.el || target === this.container) return;
      target = target.parentElement as HTMLElement;
    }

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }

    this.isShow = false;
    this.showHideAction();
  }
  onHide() {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }

    this.closeTimeout = setTimeout(() => {
      this.isShow = false;
      this.showHideAction();
    }, 200);
  }
  onBlur() {
    if (this.el) this.el.blur();
    this.onHide();
  }
  destroy() {
    const container = this.container;
    const el = this.el;

    container.removeEventListener('mouseenter', this.onShow.bind(this));
    container.removeEventListener('mouseover', this.onShow.bind(this));
    el.removeEventListener('click', this.onShow.bind(this));
    el.removeEventListener('mouseleave', this.onLeave.bind(this));
    el.removeEventListener('mouseenter', this.onEnter.bind(this));
    document.removeEventListener('click', this.onBody.bind(this));
    if (this.resizeUtil) {
      this.resizeUtil.destroy();
    }
    if (this.isRendered) {
      document.body.removeChild(this.container);
    }
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
  }
}
const conatiner = document.getElementById('container')!;
let beforeActive = '';
const dataList = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治'];

function getItems(list: string[]) {
  return list
    .map((item) => `<div class="item ${beforeActive === item ? 'active' : ''}"  title=${item}>${item}</div>`)
    .join('');
}
conatiner.innerHTML = getItems(dataList);
const el = document.getElementById('input')!;
const input = el.firstChild! as HTMLInputElement;
const mypopper = new PopperBase(el, conatiner, {
  fitInputWidth: true
});
input.addEventListener('change', (ev: Event) => {
  console.log('🚀 ~ index.ts ~ input.addEventListener ~ ev:', ev);
  if (input.value) {
    console.log('🚀 ~ index.ts ~ input.addEventListener ~ search:', input.value);
    const list = dataList.filter((it) => it.indexOf(input.value) >= 0);
    if (list.length === 0) {
      conatiner.innerHTML = `<div class="no-data">暂无数据</div>`;
    } else {
      conatiner.innerHTML = getItems(list);
    }
  } else {
    conatiner.innerHTML = getItems(dataList);
  }
  mypopper.onShow();
});

conatiner.addEventListener('click', (ev: MouseEvent) => {
  const target = ev.target as HTMLElement;
  if (target.title) {
    if (beforeActive) {
      const before = conatiner.querySelector(`[title="${beforeActive}"]`)!;
      if (before.classList.contains('active')) before.classList.remove('active');
    }

    input.value = target.title;
    beforeActive = target.title;
    if (!target.classList.contains('active')) target.classList.add('active');
    // mypopper.toggle();
  }
});
