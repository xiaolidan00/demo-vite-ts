import dayjs from 'dayjs';
import './tooltip.scss';
import { getDarkColor } from 'xcolor-helper';
import BaseResize from '../utils/BaseResize';
import { debounce } from 'lodash-es';

type DrawItem = {
  start: number;
  end: number;
  timeRange: string;
  name: string;
  color: string;
};
type TimeBarItem = {
  startTime: number;
  endTime: number;
  timeRange: string;
  status: number;
};
type DataItem = {
  name: string;
  data: Array<TimeBarItem>;
};
class TimeRangeCanvas {
  resizeUtil: BaseResize;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: any;
  active: string = '';

  tooltip: HTMLDivElement;
  actionMap: any[] = [];
  draw: Function;
  isMove = false;
  moveStart = 0;
  moveStep = 0.5;
  moveOffset = 0;
  scale = 1;
  maxScale = 4;
  minScale = 1;
  scaleStep = 0.5;
  barLen = 1;
  onScale: Function;
  min = Number.MAX_VALUE;
  max = 0;
  range = 0;
  list: DrawItem[] = [];
  data: DataItem[] = [];

  constructor(canvas: HTMLCanvasElement, data: DataItem[], config: any) {
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d')!;
    this.config = config;

    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '3100';
    tooltip.style.pointerEvents = 'none';
    this.tooltip = tooltip;
    document.body.appendChild(tooltip);
    this.onScale = debounce(this.onWheel.bind(this), 100);
    canvas.addEventListener('pointerdown', this.onMoveStart.bind(this));

    canvas.addEventListener('pointermove', this.onHover.bind(this));
    canvas.addEventListener('pointerup', this.onMoveEnd.bind(this));
    canvas.addEventListener('pointerleave', this.onMoveEnd.bind(this));
    canvas.addEventListener('wheel', this.onScale.bind(this));
    this.resizeUtil = new BaseResize(canvas, this.resizeCanvas.bind(this));
    this.draw = debounce(this.onDraw.bind(this), 100);
    this.data = data;
    this.setData(data);
  }
  onWheel(ev: WheelEvent) {
    let s = this.scale;
    if (ev.deltaY > 0) {
      //down
      s = s - this.scaleStep;
      if (s < this.minScale) {
        s = this.minScale;
      }
    } else {
      //up
      s = s + this.scaleStep;
      if (s > this.maxScale) {
        s = this.maxScale;
      }
    }
    this.scale = s;
    if (this.scale === 1) {
      this.moveOffset = 0;
    } else {
      this.moveOffset = -((ev.offsetX - this.config.paddingLeft) / this.barLen) * this.scale * this.barLen;
    }
    this.checkMove();
    this.draw();
  }
  onMoveEnd() {
    if (this.isMove && this.scale > 1) {
      this.isMove = false;

      this.draw();
    }
  }
  onMoveStart(ev: PointerEvent) {
    this.isMove = true;
    this.moveStart = ev.offsetX;
    this.hideTooltip();
  }
  checkMove() {
    if (this.moveOffset > 0) {
      this.moveOffset = 0;
    } else if (this.moveOffset < this.barLen - this.barLen * this.scale) {
      this.moveOffset = this.barLen - this.barLen * this.scale;
    }
  }
  onHover(ev: PointerEvent) {
    const x = ev.offsetX;
    const y = ev.offsetY;

    if (this.isMove) {
      this.moveOffset += (ev.offsetX - this.moveStart) * this.moveStep;

      this.checkMove();
      this.moveStart = x;

      return;
    }
    const tooltip = this.tooltip;
    const bound = this.canvas.getBoundingClientRect();

    for (let i = 0; i < this.actionMap.length; i++) {
      const item = this.actionMap[i];
      if (x >= item.left && x <= item.left + item.w && y >= item.top && y <= item.h + item.top) {
        if (this.active != item.id) {
          this.active = item.id;

          tooltip.innerHTML = this.tooltipFormatter(item.data);
          tooltip.style.left = `${bound.left + item.left}px`;
          const t = bound.top + item.top - (tooltip.offsetHeight || 92);
          tooltip.style.top = `${Math.max(t, 0)}px`;
          tooltip.style.display = 'block';
          this.draw();
        }
        return;
      }
    }
    this.hideTooltip();
  }
  hideTooltip() {
    this.tooltip.style.display = 'none';
    this.active = '';
    this.draw();
  }
  tooltipFormatter(params: any) {
    return `<div class="tooltip-container">
            <div class="tooltip-item">
            <span class="tooltip-item-color" style="background:${params.color}"></span>
            <span class="tooltip-item-name " >${params.name}
          </span>  <span style="color:#009ea1;">${Number(params.timeRange).toFixed(2)}</span>小时
            </div>
             <div class="tooltip-item">
               <span class="tooltip-item-name " >开始时间：</span>
               <span class="tooltip-item-value " >${dayjs(params.start).format('YYYY-MM-DD HH:mm:ss')}</span>
             </div>
              <div class="tooltip-item">
               <span class="tooltip-item-name " >结束时间：</span>
               <span class="tooltip-item-value " >${dayjs(params.end).format('YYYY-MM-DD HH:mm:ss')}</span>
             </div> 
            </div>`;
  }
  setConfig(config: any) {
    this.config = config;
    this.scale = 1;
    this.moveOffset = 0;

    this.draw();
  }
  setData(data: any[]) {
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;

    const list: any[] = [];
    data.forEach((item: any) => {
      const draw: any[] = [];
      item.data.forEach((a: any) => {
        const start = new Date(a.startTime).getTime();
        const end = new Date(a.endTime).getTime();
        const typeItem = this.config.types[a.status];
        draw.push({
          start,
          end,
          timeRange: a.timeRange,
          name: typeItem.name,
          color: typeItem.color
        });
        min = Math.min(start, min);
        max = Math.max(max, end);
      });
      list.push({
        name: item.name,
        data: draw
      });
    });
    this.list = list;
    this.max = max;
    this.min = min;
    this.range = max - min;
    this.maxScale = Math.ceil(((max - min) / 24) * 3600 * 1000) + 1;
    this.scale = 1;
    this.moveOffset = 0;

    this.draw();
  }

  onDraw() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const op = this.config;

    const heightUnit = (canvas.height - op.textBottom) / this.data.length;
    const heightHalf = heightUnit * 0.5;
    const heightGap = (1 - op.barPercent) * heightUnit * 0.5;
    const barLen = canvas.width - op.paddingLeft - op.paddingRight;
    const barLength = barLen * this.scale;

    const barWidth = heightUnit * op.barPercent;
    this.barLen = barLen;
    const min = this.min,
      list = this.list;

    this.actionMap = [];

    const range = this.range;
    const lerp = (size: number) => {
      return this.moveOffset + ((size - min) / range) * barLength;
    };

    //字体样式she
    ctx.font = `${op.fontSize}px serif`;
    ctx.fillStyle = op.fontColor;
    ctx.textAlign = 'left';
    //x轴时间标签
    let step = 4;
    if (range > 24 * 3600 * 1000) {
      step = 12;
    }
    step = Math.round(step / this.scale);

    const count = Math.ceil(range / (step * 3600 * 1000));
    for (let i = 0; i <= count; i++) {
      const d = dayjs(min)
        .add(i * step, 'hour')
        .format('YYYY-MM-DD HH:mm:ss');

      const t = new Date(d).getTime();
      let text = dayjs(t).format('HH:mm');
      if (text == '00:00') text = dayjs(t).format('MM/DD');
      const textW = ctx.measureText(text).width;
      const x = lerp(t);
      if (x < 0) continue;
      if (x > barLen + 1) continue;

      ctx.fillText(text, x + op.paddingLeft - textW * 0.5, canvas.height - op.textBottom * 0.5);
    }

    list.forEach((item: any, i: number) => {
      //y轴类目
      const textW = ctx.measureText(item.name).width;
      ctx.fillText(item.name, op.paddingLeft - textW - 5, heightUnit * i + heightHalf);
      item.data.forEach((a: any, j: number) => {
        const id = i + '-' + j;
        let x = lerp(a.start);
        let x1 = lerp(a.end);
        if (x < 0 && x1 < 0) return;
        else if (x > barLen) return;
        else {
          if (x < 0) {
            x = 0;
          }
          if (x1 > barLen) {
            x1 = barLen;
          }
        }
        if (this.active && this.active !== id) {
          ctx.fillStyle = getDarkColor(a.color, 0.5);
        } else {
          ctx.fillStyle = a.color;
        }

        const left = op.paddingLeft + x;
        const top = heightUnit * i + heightGap;
        const w = x1 - x;
        if (w <= 0) return;
        ctx.fillRect(left, top, w, barWidth);
        this.actionMap.push({
          id,
          data: a,
          left: left,
          top: top,
          w,
          h: barWidth
        });
      });
    });
  }
  resizeCanvas() {
    this.canvas.width = this.canvas.parentElement!.offsetWidth || this.config.width;
    this.canvas.height = this.canvas.parentElement!.offsetHeight || this.config.height;
    if (this.draw) this.draw();
  }
  destroy() {
    document.body.removeChild(this.tooltip);
    const canvas = this.canvas;
    canvas.addEventListener('pointermove', this.onHover.bind(this));
    canvas.addEventListener('pointerup', this.onMoveEnd.bind(this));
    canvas.addEventListener('pointerleave', this.onMoveEnd.bind(this));
    canvas.addEventListener('wheel', this.onScale.bind(this));
    this.destroy();
  }
}

//不同状态名称和颜色设置
const types = [
  { name: '运行', color: '#32CD32' }, // 0
  { name: '离线', color: '#808080' }, // 1
  { name: '报警', color: '#FF6347' }, // 2
  { name: '静止', color: '#1E90FF' } // 3
];

const totalTime = 3600 * 1000 * 24 * 3;
const dataList = [];
//生成模拟数据
for (let i = 1; i <= 5; i++) {
  const items = [];
  const count = Math.round(Math.random() * 10) + 5;
  let before = new Date('2025-01-01 00:00:00').getTime();
  let status = Math.round(Math.random() * 99) % types.length;
  const unit = totalTime / count;
  for (let j = 0; j < count; j++) {
    const t = unit + before;
    items.push({
      startTime: before,
      endTime: t,
      timeRange: Number((t - before) / 3600000).toFixed(2),
      status: status
    });
    status = (status + (Math.floor(Math.random() * 99) % 3 ? 3 : 1)) % types.length;
    before = t;
  }
  dataList.push({
    name: '设备' + i,
    data: items
  });
}

const canvas = document.querySelector('canvas')!;

const timeBar = new TimeRangeCanvas(canvas, dataList, {
  width: 800,
  height: 800,
  data: dataList,
  timeType: '24',
  paddingLeft: 30,
  textBottom: 20,
  barPercent: 0.6,
  fontSize: 12,
  fontColor: 'gray',
  paddingRight: 20,
  types
});
