import TWEEN from '@tweenjs/tween.js';
import interact from 'interactjs';
import BaseResize from '../utils/BaseResize';

const getDistance = (start: [number, number], end: [number, number]) => {
  return Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
};
const lerp = (s: number, e: number, t: number) => {
  if (t > 1) return e;
  if (t < 0) return s;
  return s + t * (e - s);
};
const lerpPoint = (start: [number, number], end: [number, number], t: number) => {
  return [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
};

class BaseShape {
  id: string | number;
  props: any;
  theTween: any;
  constructor(id: string | number) {
    this.id = id;
  }
  draw(ctx: CanvasRenderingContext2D) {}
  stop() {}
  edit(mask: HTMLDivElement) {}
  unedit(mask: HTMLDivElement) {}
  clickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {}

  dbclickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {}
}
type RunningPathType = {
  id: string | number;
  //像素点
  path: [number, number][];
  //流动速度：像素/秒
  speed: number;
  //线宽
  strokeWidth?: number;
  //线颜色
  strokeColor?: string | string[];
  //实线长度
  stepWidth: number;
  //间隔长度
  dashWidth: number;
  //线段两端
  lineCap?: 'round' | 'butt' | 'square';
  //透明度
  opacity?: number;
  //反向流动
  reverse?: boolean;
};
class RunningPath extends BaseShape {
  props: RunningPathType;
  points: HTMLDivElement[] = [];
  constructor(props: RunningPathType) {
    super(props.id);
    this.props = props;
  }
  addPoint(a: [number, number], i: number) {
    const p = document.createElement('div');
    p.className = 'edit-point';
    p.dataset.index = i + '';
    p.dataset.id = this.id + '';
    p.style.left = a[0] + 'px';
    p.style.top = a[1] + 'px';
    p.innerHTML = i + 1 + '';

    return p;
  }
  edit(mask: HTMLDivElement) {
    const points: HTMLDivElement[] = [];
    this.props.path.forEach((a, i: number) => {
      const p = this.addPoint(a, i);
      mask.appendChild(p);
      points.push(p);
    });
    this.points = points;
  }
  unedit(mask: HTMLDivElement) {
    this.points.forEach((a) => {
      mask.removeChild(a);
    });
    this.points = [];
  }
  stop() {
    if (this.theTween) {
      this.theTween.stop();
      TWEEN.remove(this.theTween);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.stop();
    const props = this.props;
    const p = props.path;
    //路径点数量小于2不绘制
    if (p.length < 2) return;
    //折线总长度
    let sum = 0;
    let pre = 0;
    //计算每段折线的长度和开始结束距离
    const pathList: Array<{
      start: [number, number];
      startV: number;
      end: [number, number];
      endV: number;
      size: number;
    }> = [];
    for (let i = 1; i < p.length; i++) {
      const start = p[i - 1];
      const end = p[i];
      const d = getDistance(start, end);
      sum += d;
      pathList.push({
        start,
        end,
        startV: pre,
        endV: sum,
        size: sum - pre
      });
      pre = sum;
    }
    //每段单位实线和虚线的长度
    const unit = props.dashWidth + props.stepWidth;
    //虚线的段数
    const num = Math.ceil(sum / unit);

    const drawLine = (obj: { t: number }) => {
      //折线样式
      ctx.lineCap = props.lineCap || 'butt';
      ctx.shadowBlur = 0;
      ctx.globalAlpha = props.opacity || 1;
      ctx.lineWidth = props.strokeWidth || 1;
      let lineColor: any = 'red';
      if (typeof props.strokeColor === 'string' && props.strokeColor) {
        lineColor = props.strokeColor;
      } else if (Array.isArray(props.strokeColor) && props.strokeColor.length === 2) {
        const start = props.path[0];
        const end = props.path[props.path.length - 1];
        const startColor = props.strokeColor[0];
        const endColor = props.strokeColor[1];
        const grd = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
        grd.addColorStop(0.1, startColor);
        grd.addColorStop(0.9, endColor);
        lineColor = grd;
      }
      ctx.strokeStyle = lineColor;
      //移动距离
      const d = obj.t * sum;

      //绘制折线
      ctx.beginPath();
      for (let i = 0; i < num; i++) {
        //实线开始点距离
        const a = (d + i * unit) % sum;
        for (let j = 0; j < pathList.length; j++) {
          const current = pathList[j];
          //实线结束点距离
          const b = (a + props.stepWidth) % sum;

          if (a >= current.startV && a < current.endV) {
            const t = (a - current.startV) / current.size;
            const p0 = lerpPoint(current.start, current.end, t);
            if (b > a) {
              if (b >= current.startV && b < current.endV) {
                //同一段直线
                const e = (b - current.startV) / current.size;
                const p1 = lerpPoint(current.start, current.end, e);
                ctx.moveTo(p0[0], p0[1]);
                ctx.lineTo(p1[0], p1[1]);
              } else {
                //拐点
                const next = pathList[j + 1];
                ctx.moveTo(p0[0], p0[1]);
                ctx.lineTo(current.end[0], current.end[1]);
                //下一条直线的开始
                const e = (b - next.startV) / next.size;
                const p1 = lerpPoint(next.start, next.end, e);
                ctx.lineTo(p1[0], p1[1]);
              }
            } else {
              //头尾循环
              ctx.moveTo(p0[0], p0[1]);
              ctx.lineTo(current.end[0], current.end[1]);

              //开始直线
              const first = pathList[0];
              const e = (b - first.startV) / first.size;
              const p1 = lerpPoint(first.start, first.end, e);
              ctx.moveTo(first.start[0], first.start[1]);
              ctx.lineTo(p1[0], p1[1]);
            }
            break;
          }
        }
      }
      ctx.stroke();
    };

    this.theTween = new TWEEN.Tween({ t: props.reverse ? 1 : 0 })
      .to({ t: props.reverse ? 0 : 1 }, Math.round((sum / props.speed) * 1000))
      .repeat(Infinity)
      .onUpdate(drawLine);

    TWEEN.add(this.theTween);
    this.theTween.start();
  }
  clickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    //单击画布添加点
    if (ev.target === mask) {
      const item: [number, number] = [Math.round(ev.offsetX), Math.round(ev.offsetY)];
      const p = this.addPoint(item, this.props.path.length);
      this.props.path.push(item);
      mask.appendChild(p);
      this.points.push(p);
      this.draw(ctx);
    }
  }
  dbclickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    const target = ev.target as HTMLElement;
    //双击点删除
    if (target.dataset.id && target.dataset.index) {
      const idx = Number(target.dataset.index);
      this.props.path.splice(idx, 1);
      this.points.splice(idx, 1);
      mask.removeChild(target);
      this.points.forEach((a, i) => {
        a.innerHTML = i + 1 + '';
        a.dataset.index = i + '';
      });
      this.draw(ctx);
    }
  }
}

type CirclePathType = {
  id: string | number;
  //路径
  path: [number, number][];
  //路径颜色
  pathColor?: string;
  //路径宽度
  pathWidth?: number;
  //路径透明度
  pathOpacity?: number;
  //小球半径
  radius: number;
  //小球颜色
  color?: string;
  //泛光边缘
  blur?: number;
  //透明度
  opacity?: number;
  //反向流动
  reverse?: boolean;
  //小球数量
  pointNum?: number;
  //流动速度 像素/秒
  speed: number;
};
class CirclePath extends BaseShape {
  props: CirclePathType;
  points: HTMLDivElement[] = [];
  constructor(props: CirclePathType) {
    super(props.id);
    this.props = props;
  }
  addPoint(a: [number, number], i: number) {
    const p = document.createElement('div');
    p.className = 'edit-point';
    p.dataset.index = i + '';
    p.dataset.id = this.id + '';
    p.style.left = a[0] + 'px';
    p.style.top = a[1] + 'px';
    p.innerHTML = i + 1 + '';

    return p;
  }
  edit(mask: HTMLDivElement) {
    const points: HTMLDivElement[] = [];
    this.props.path.forEach((a, i: number) => {
      const p = this.addPoint(a, i);
      mask.appendChild(p);
      points.push(p);
    });
    this.points = points;
  }
  unedit(mask: HTMLDivElement) {
    this.points.forEach((a) => {
      mask.removeChild(a);
    });
    this.points = [];
  }
  stop() {
    if (this.theTween) {
      this.theTween.stop();
      TWEEN.remove(this.theTween);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.stop();
    const props = this.props;

    const p = props.path;
    if (p.length < 2) return;
    let sum = 0;
    let pre = 0;
    const pathList: Array<{
      start: [number, number];
      startV: number;
      end: [number, number];
      endV: number;
      size: number;
    }> = [];
    for (let i = 1; i < p.length; i++) {
      const start = p[i - 1];
      const end = p[i];
      const d = getDistance(start, end);
      sum += d;
      pathList.push({
        start,
        end,
        startV: pre,
        endV: sum,
        size: sum - pre
      });
      pre = sum;
    }

    //小球数量
    const num = props.pointNum || 5;
    //单位长度
    const unit = sum / num;
    const drawLine = (obj: { t: number }) => {
      ctx.lineCap = 'butt';

      //绘制路径底线
      if (props.pathWidth) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = props.pathOpacity || 0.3;
        ctx.lineWidth = props.pathWidth;
        ctx.strokeStyle = props.pathColor || 'red';
        ctx.beginPath();
        const startPoint = props.path[0];
        ctx.moveTo(startPoint[0], startPoint[1]);
        for (let i = 1; i < props.path.length; i++) {
          const item = props.path[i];
          ctx.lineTo(item[0], item[1]);
        }
        ctx.stroke();
      }
      //小球样式
      ctx.shadowBlur = props.blur || 10;
      ctx.shadowColor = props.color || 'red';
      ctx.fillStyle = props.color || 'red';
      ctx.globalAlpha = props.opacity || 1;
      //移动距离
      const d = obj.t * sum;
      for (let i = 0; i < num; i++) {
        //小球距离
        const s = (d + i * unit) % sum;
        for (let j = 0; j < pathList.length; j++) {
          const current = pathList[j];
          //球落在该线段
          if (s >= current.startV && s < current.endV) {
            //小球的位置
            const p0 = lerpPoint(current.start, current.end, (s - current.startV) / current.size);
            ctx.beginPath();
            ctx.arc(p0[0], p0[1], props.radius, 0, 2 * Math.PI);
            ctx.fill();
            break;
          }
        }
      }
    };

    this.theTween = new TWEEN.Tween({ t: props.reverse ? 1 : 0 })
      .to({ t: props.reverse ? 0 : 1 }, Math.round((sum / props.speed) * 1000))
      .repeat(Infinity)
      .onUpdate(drawLine);

    TWEEN.add(this.theTween);
    this.theTween.start();
  }
  clickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    //单击画布添加点
    if (ev.target === mask) {
      const item: [number, number] = [Math.round(ev.offsetX), Math.round(ev.offsetY)];
      const p = this.addPoint(item, this.props.path.length);
      this.props.path.push(item);
      mask.appendChild(p);
      this.points.push(p);
      this.draw(ctx);
    }
  }
  dbclickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    const target = ev.target as HTMLElement;
    //双击点删除
    if (target.dataset.id && target.dataset.index) {
      const idx = Number(target.dataset.index);
      this.props.path.splice(idx, 1);
      this.points.splice(idx, 1);
      mask.removeChild(target);
      this.points.forEach((a, i) => {
        a.innerHTML = i + 1 + '';
        a.dataset.index = i + '';
      });
      this.draw(ctx);
    }
  }
}

type CurvePathType = {
  id: string | number;
  //路径
  path: [number, number][];
  //路径颜色
  pathColor?: string;
  //路径宽度
  pathWidth?: number;
  //路径透明度
  pathOpacity?: number;
  //小球数量
  pointNum?: number;
  //小球半径
  radius: number;
  //小球颜色
  color?: string;
  //泛光边缘
  blur?: number;
  //透明度
  opacity?: number;
  //反向流动
  reverse?: boolean;
  //流动速度
  speed: number;
};
class CurvePath extends BaseShape {
  props: CurvePathType;
  points: HTMLDivElement[] = [];
  pointText: any = {
    0: 'S',
    1: '1',
    2: '2',
    3: 'E'
  };
  constructor(props: CurvePathType) {
    super(props.id);
    this.props = props;
  }
  addPoint(a: [number, number], i: number) {
    const p = document.createElement('div');
    p.className = 'edit-point';
    p.dataset.index = i + '';
    p.dataset.id = this.id + '';
    p.style.left = a[0] + 'px';
    p.style.top = a[1] + 'px';
    p.innerHTML = this.pointText[i] || '';

    return p;
  }
  edit(mask: HTMLDivElement) {
    const points: HTMLDivElement[] = [];
    this.props.path.forEach((a, i) => {
      const p = this.addPoint(this.props.path[i], i);
      mask.appendChild(p);
      points.push(p);
    });

    this.points = points;
  }
  unedit(mask: HTMLDivElement) {
    this.points.forEach((a) => {
      mask.removeChild(a);
    });
    this.points = [];
  }
  stop() {
    if (this.theTween) {
      this.theTween.stop();
      TWEEN.remove(this.theTween);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.stop();
    const props = this.props;

    if (props.path.length < 4) return;
    //距离总和
    let sum = 0;
    for (let i = 1; i < props.path.length; i++) {
      sum += getDistance(props.path[i - 1], props.path[i]);
    }
    //小球数量
    const num = props.pointNum || 5;
    //单位间隔百分比
    const unit = 1 / num;

    const bezierCurve = (t: number) => {
      const start = props.path[0],
        control1 = props.path[1],
        control2 = props.path[2],
        end = props.path[3];
      const x =
        Math.pow(1 - t, 3) * start[0] +
        3 * t * Math.pow(1 - t, 2) * control1[0] +
        3 * Math.pow(t, 2) * (1 - t) * control2[0] +
        Math.pow(t, 3) * end[0];
      const y =
        Math.pow(1 - t, 3) * start[1] +
        3 * t * Math.pow(1 - t, 2) * control1[1] +
        3 * Math.pow(t, 2) * (1 - t) * control2[1] +
        Math.pow(t, 3) * end[1];
      return [x, y];
    };

    const drawLine = (obj: { t: number }) => {
      ctx.lineCap = 'butt';

      //绘制贝塞尔曲线路径底线
      if (props.pathWidth) {
        //路径样式
        ctx.shadowBlur = 0;
        ctx.globalAlpha = props.pathOpacity || 0.3;
        ctx.lineWidth = props.pathWidth || props.radius * 2;
        ctx.strokeStyle = props.pathColor || 'red';
        //贝塞尔曲线
        ctx.beginPath();
        const startPoint = props.path[0];
        ctx.moveTo(startPoint[0], startPoint[1]);
        const c1 = props.path[1];
        const c2 = props.path[2];
        const endPoint = props.path[3];
        ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], endPoint[0], endPoint[1]);
        ctx.stroke();
      }

      //小球样式
      ctx.shadowBlur = props.blur || 10;
      ctx.shadowColor = props.color || 'red';
      ctx.fillStyle = props.color || 'red';
      ctx.globalAlpha = props.opacity || 1;

      for (let i = 0; i < num; i++) {
        //小球位置百分比
        const s = (obj.t + i * unit) % 1;
        //小球在贝塞尔曲线的位置
        const p0 = bezierCurve(s);
        ctx.beginPath();
        ctx.arc(p0[0], p0[1], props.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    this.theTween = new TWEEN.Tween({ t: props.reverse ? 1 : 0 })
      .to({ t: props.reverse ? 0 : 1 }, Math.round((sum / props.speed) * 1000))
      .repeat(Infinity)
      .onUpdate(drawLine);

    TWEEN.add(this.theTween);
    this.theTween.start();
  }
  clickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    //单击画布添加点
    if (ev.target === mask && this.props.path.length < 4) {
      const item: [number, number] = [Math.round(ev.offsetX), Math.round(ev.offsetY)];
      const p = this.addPoint(item, this.props.path.length);
      this.props.path.push(item);
      mask.appendChild(p);
      this.points.push(p);
      this.draw(ctx);
    }
  }
  dbclickAction(ev: MouseEvent, mask: HTMLElement, ctx: CanvasRenderingContext2D) {
    const target = ev.target as HTMLElement;
    //双击点删除
    if (target.dataset.id && target.dataset.index) {
      const idx = Number(target.dataset.index);
      this.props.path.splice(idx, 1);
      this.points.splice(idx, 1);
      mask.removeChild(target);
      this.points.forEach((a, i) => {
        a.innerHTML = this.pointText[i];
        a.dataset.index = i + '';
      });
      this.draw(ctx);
    }
  }
}
class CanvasManager {
  animate: any;
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  shapes = [] as BaseShape[];
  currentShape: any;
  resize: BaseResize;
  mask: HTMLDivElement;
  currentId: number | string = '';
  constructor(el: HTMLElement) {
    this.el = el;
    this.mask = document.createElement('div');
    this.mask.style.position = 'absolute';
    this.mask.style.zIndex = '2';
    this.mask.style.width = el.offsetWidth + 'px';
    this.mask.style.height = el.offsetHeight + 'px';
    el.appendChild(this.mask);
    this.canvas = document.createElement('canvas');
    el.appendChild(this.canvas);
    this.canvas.width = el.offsetWidth;
    this.canvas.height = el.offsetHeight;
    this.ctx = this.canvas.getContext('2d')!;

    this.resize = new BaseResize(this.el, () => {
      this.canvas.width = el.offsetWidth;
      this.canvas.height = el.offsetHeight;
      this.mask.style.width = el.offsetWidth + 'px';
      this.mask.style.height = el.offsetHeight + 'px';
    });

    this.onAnimate();
  }

  edit(shape: BaseShape) {
    if (this.currentId) return;
    this.currentId = shape.id;
    shape.edit(this.mask);
    this.currentShape = shape;
    const postion = {
      x: 0,
      y: 0
    };
    interact('.edit-point').draggable({
      listeners: {
        start: () => {
          postion.x = 0;
          postion.y = 0;
        },
        move: (ev) => {
          postion.x += ev.dx;
          postion.y += ev.dy;
          const target = ev.target as HTMLElement;
          target.style.transform = `translate(${postion.x}px,${postion.y}px)`;
        },
        end: (ev) => {
          const target = ev.target as HTMLElement;
          target.style.transform = '';
          const idx = Number(target.dataset.index);
          const item = shape.props.path[idx];
          const newItem = [item[0] + postion.x, item[1] + postion.y];
          shape.props.path[idx] = newItem;
          target.style.left = newItem[0] + 'px';
          target.style.top = newItem[1] + 'px';
          shape.draw(this.ctx);
        }
      }
    });
    this.mask.onclick = this.onClick.bind(this);
    this.mask.ondblclick = this.onDbClick.bind(this);
  }
  onDbClick(ev: MouseEvent) {
    if (this.currentId) {
      this.currentShape.dbclickAction(ev, this.mask, this.ctx);
    }
    ev.preventDefault();
    ev.stopPropagation();
  }
  onClick(ev: MouseEvent) {
    if (this.currentId) {
      this.currentShape.clickAction(ev, this.mask, this.ctx);
    }

    ev.preventDefault();
    ev.stopPropagation();
  }
  unedit() {
    this.currentShape.unedit(this.mask);
    interact('.edit-point').draggable(false);
    this.mask.onclick = null;
    this.mask.ondblclick = null;
    this.currentId = '';
    this.currentShape = undefined;
  }
  add(shape: BaseShape) {
    shape.draw(this.ctx);
    this.shapes.push(shape);
  }
  getShapeById(id: string | number) {
    return this.shapes.find((a) => a.id === id);
  }
  remove(shape: BaseShape) {
    shape.stop();
    const idx = this.shapes.findIndex((a) => a === shape);
    if (idx >= 0) {
      this.shapes.splice(idx, 1);
    }
  }
  removeById(id: string | number) {
    const idx = this.shapes.findIndex((a) => a.id === id);
    if (idx >= 0) {
      const shape = this.shapes[idx];
      shape.stop();
      this.shapes.splice(idx, 1);
    }
  }
  onAnimate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    TWEEN.update();
    this.animate = requestAnimationFrame(this.onAnimate.bind(this));
  }
  destroy() {
    cancelAnimationFrame(this.animate);
    this.shapes.forEach((a) => {
      a.stop();
    });
    this.shapes = [];
  }
}

const cm = new CanvasManager(document.getElementById('canvasContainer')!);
const path1 = new RunningPath({
  id: 'path1',
  path: [
    [100, 100],
    [100, 700],
    [700, 100],
    [700, 700]
  ],
  speed: 100,
  strokeWidth: 5,
  strokeColor: ['yellow', 'red'],
  stepWidth: 40,
  dashWidth: 20,
  opacity: 1,
  reverse: true
});
cm.add(path1);
const path2 = new CirclePath({
  id: 'path2',
  path: [
    [200, 100],
    [400, 600],
    [600, 100]
  ],
  pathWidth: 5,
  pointNum: 8,
  color: 'blue',
  pathColor: 'dodgerblue',
  pathOpacity: 0.5,
  speed: 100,
  radius: 10,
  opacity: 1,
  reverse: false
});
cm.add(path2);

const path3 = new CurvePath({
  id: 'path3',
  path: [
    [500, 50],
    [500, 500],
    [200, 200],

    [100, 600]
  ],
  pathWidth: 5,
  pointNum: 8,
  color: 'red',
  pathColor: 'pink',
  speed: 100,
  radius: 10,
  opacity: 1,
  reverse: false
});
cm.add(path3);
window.addEventListener('unload', () => {
  cm.destroy();
});
const btn = document.getElementById('edit')!;
const selectPath = document.getElementById('currentPath') as HTMLSelectElement;

btn.onclick = () => {
  const p = selectPath.value;

  if (btn.innerHTML === '编辑路径') {
    const s = cm.getShapeById(p);
    if (s) {
      btn.innerHTML = '关闭编辑';
      cm.edit(s);
      selectPath.disabled = true;
    }
  } else {
    cm.unedit();
    btn.innerHTML = '编辑路径';
    selectPath.disabled = false;
  }
};
