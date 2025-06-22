import urls from './urls';

const nav = document.getElementById('nav') as HTMLDivElement;
nav.innerHTML = '';
const app = document.getElementById('app') as HTMLIFrameElement;
let str = '';
let index = 0;
const hash = window.location.hash.substring(1);

let current = 0;
for (const k in urls) {
  str += `<div ><span index="${index}" key="${k}">${k}</span><img key="${k}"  src="link.svg"></div>`;
  if (hash && hash == k) {
    current = index;
  }
  index++;
}
nav.innerHTML = str;

if (hash) {
  const el = nav.children[current];
  app.src = `src/${hash}/index.html`;
  el.classList.add('active');
} else {
  const first = nav.firstElementChild as HTMLDivElement;
  first.classList.add('active');
}

nav.onclick = (ev: MouseEvent) => {
  const target = ev.target as HTMLElement;
  if (target.nodeName.toLowerCase() === 'span') {
    const key = target.getAttribute('key');
    console.log('🚀 ~ key:', key);
    app.src = `src/${key}/index.html`;
    window.location.hash = '#' + key;
    target.classList.add('active');
    current = Number(target.getAttribute('index') || '0');
  } else if (target.nodeName.toLowerCase() === 'img') {
    window.open(`src/${target.getAttribute('key')}/index.html`);
  }
};
