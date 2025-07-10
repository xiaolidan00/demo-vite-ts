type EventCallbacks = Map<Function, number>;
type EventMap = Map<string, EventCallbacks>;
export class EventEmitter {
  eventMap: EventMap = new Map();

  on(event: string, fn: Function) {
    if (typeof fn === 'function') {
      const fns = this.eventMap.get(event) as EventCallbacks;
      if (fns) {
        if (!fns.has(fn)) {
          fns.set(fn, 1);
        }
      } else {
        //采用map可以更加快速增删改查
        const fns = new Map<Function, number>();
        fns.set(fn, 1);
        this.eventMap.set(event, fns.set(fn, 1));
      }
    }
  }
  off(event: string, fn: Function) {
    if (typeof fn === 'function') {
      const fns = this.eventMap.get(event) as EventCallbacks;
      if (fns?.has(fn)) {
        fns.delete(fn);
      }
    }
  }
  emit(event: string, data?: any) {
    const fns = this.eventMap.get(event) as EventCallbacks;
    if (fns) {
      fns.forEach((i: number, fn: Function) => {
        fn(data);
      });
    }
  }
  once(event: string, fn: Function) {
    //包裹一层function，一旦触发就销毁
    const fun = (data: any) => {
      fn(data);
      this.off(event, fun);
    };
    this.on(event, fun);
  }
  clear() {
    this.eventMap.clear();
  }
}
