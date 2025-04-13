//防抖
export function debounce(fn: Function, time: number) {
  let timeout: any;
  return function () {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, arguments);
    }, time);
  };
}

export function nextTick() {
  return Promise.resolve();
}
