import urls from './urls';

const nav = document.getElementById('nav') as HTMLDivElement;
nav.innerHTML = '';
const app = document.getElementById('app') as HTMLIFrameElement;
let str = '';
let index = 0;
const hash = window.location.hash.substring(1);

let current = 0;
for (const k in urls) {
  str += `<div index="${index}" key="${k}">${k}</div>`;
  if (hash && hash == k) {
    current = index;
  }
  index++;
}
nav.innerHTML = str;

if (hash) {
  const page = nav.children[current] as HTMLDivElement;
  setPath(page);
} else {
  const first = nav.firstElementChild as HTMLDivElement;
  setPath(first);
}

index = 0;
function setPath(el: HTMLElement) {
  const key = el.getAttribute('key');
  if (key) {
    const beforeEl = nav.children[index];
    if (beforeEl) beforeEl.classList.remove('active');

    const path = urls[key as keyof typeof urls];
    app.src = path.replace('.ts', '.html');
    window.location.hash = key;
    el.classList.add('active');
    index = Number(el.getAttribute('index') || '0');
  }
}
nav.onclick = (ev: MouseEvent) => {
  const target = ev.target as HTMLElement;
  setPath(target);
};
