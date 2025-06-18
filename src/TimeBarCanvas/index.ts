import mockData from './mock.json';
import dayjs from 'dayjs';
import './tooltip.scss';
import { getDarkColor } from 'xcolor-helper';
import BaseResize from '../utils/BaseResize';
import { debounce } from 'lodash-es';

class TimeRangeCanvas {
  resizeUtil: BaseResize;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: any;
  active: string = '';
  data: any[];
  tooltip: HTMLDivElement;
  actionMap: any[] = [];
  draw: Function;
  constructor(canvas: HTMLCanvasElement, data: any[], config: any) {
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d')!;
    this.config = config;

    this.data = data;

    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '3100';
    this.tooltip = tooltip;
    document.body.appendChild(tooltip);

    canvas.addEventListener('pointermove', this.onHover.bind(this));
    this.resizeUtil = new BaseResize(canvas, this.resizeCanvas.bind(this));
    this.draw = debounce(this.onDraw, 100);
    this.draw();
  }
  onHover(ev: PointerEvent) {
    const tooltip = this.tooltip;
    const x = ev.offsetX;
    const y = ev.offsetY;
    const bound = this.canvas.getBoundingClientRect();

    for (let i = 0; i < this.actionMap.length; i++) {
      const item = this.actionMap[i];
      if (x >= item.left && x <= item.left + item.w && y >= item.top && y <= item.h + item.top) {
        if (this.active != item.id) {
          this.active = item.id;

          tooltip.innerHTML = this.tooltipFormatter(item.data);
          tooltip.style.left = `${bound.left + item.left}px`;
          const t = bound.top + item.top - tooltip.offsetHeight;
          tooltip.style.top = `${Math.max(t, 0)}px`;
          tooltip.style.display = 'block';
          this.draw();
        }
        return;
      }
    }
    tooltip.style.display = 'none';
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
  setData(data: any[]) {
    this.data = data;
    this.draw();
  }
  onDraw() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const types = this.config.types;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const op = this.config;

    const heightUnit = (canvas.height - op.textBottom) / this.data.length;
    const heightHalf = heightUnit * 0.5;
    const heightGap = (1 - op.barPercent) * heightUnit * 0.5;
    const barLength = canvas.width - op.textWidth - op.paddingRight;
    const barWidth = heightUnit * op.barPercent;
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;

    const list: any[] = [];
    this.data.forEach((item: any) => {
      const draw: any[] = [];
      item.data
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .forEach((a: any) => {
          const start = new Date(a.startTime).getTime();
          const end = new Date(a.endTime).getTime();
          const typeItem = types[a.pumpWaterSituation] || types[3];
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

    this.actionMap = [];
    min = new Date(dayjs(min).format('YYYY-MM-DD') + ' 00:00:00').getTime();
    max = new Date(dayjs(max).format('YYYY-MM-DD') + ' 23:59:59').getTime();
    const range = max - min;
    const lerp = (size: number) => {
      return ((size - min) / range) * barLength;
    };
    let step = 4;
    if (range > 24 * 3600 * 1000) {
      step = 12;
    }
    const count = Math.ceil(range / (step * 3600 * 1000));
    for (let i = 0; i <= count; i++) {
      ctx.font = `${op.fontSize}px serif`;
      ctx.fillStyle = op.fontColor;
      ctx.textAlign = 'left';
      const d = dayjs(min)
        .add(i * step, 'hour')
        .format('YYYY-MM-DD HH:mm:ss');

      const t = new Date(d).getTime();
      const text = dayjs(t).format('HH:mm');
      const textW = ctx.measureText(text).width;
      const x = lerp(t) + op.textWidth;

      ctx.fillText(text, x - textW * 0.5, canvas.height - op.textBottom * 0.5);
    }

    list.forEach((item: any, i: number) => {
      ctx.font = `${op.fontSize}px serif`;
      ctx.fillStyle = op.fontColor;
      ctx.textAlign = 'left';

      const textW = ctx.measureText(item.name).width;

      ctx.fillText(item.name, op.textWidth - textW - 5, heightUnit * i + heightHalf);
      item.data.forEach((a: any, j: number) => {
        const id = i + '-' + j;
        const x = lerp(a.start);
        const x1 = lerp(a.end);

        if (this.active && this.active !== id) {
          ctx.fillStyle = getDarkColor(a.color, 0.5);
        } else {
          ctx.fillStyle = a.color;
        }

        const left = op.textWidth + x;
        const top = heightUnit * i + heightGap;
        const w = x1 - x;
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
    this.draw();
  }
  destroy() {
    document.body.removeChild(this.tooltip);
    this.canvas.removeEventListener('pointermove', this.onHover.bind(this));
    this.destroy();
  }
}

const canvas = document.querySelector('canvas')!;

const timeBar = new TimeRangeCanvas(canvas, mockData, {
  width: 800,
  height: 800,
  data: mockData,
  timeType: '24',
  textWidth: 30,
  textBottom: 20,
  barPercent: 0.6,
  fontSize: 12,
  fontColor: 'gray',
  paddingRight: 20,
  types: [
    { name: '停止', color: '#C9CDD4' }, // 0
    { name: '运行', color: '#00B42A' }, // 1
    { name: '故障', color: '#F53F3F' }, // 2
    { name: '未知', color: '#EFEFEF' } // 3
  ]
});
