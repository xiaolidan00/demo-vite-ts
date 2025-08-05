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
  darkColor: string;
};
type DrawItems = {
  name: string;
  data: Array<DrawItem>;
};
type DataItem = {
  startTime: number;
  endTime: number;
  timeRange: string;
  status: number;
};
type DataItems = {
  name: string;
  data: Array<DataItem>;
};
class TimeRangeCanvas {
  resizeUtil: BaseResize;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  ctx: CanvasRenderingContext2D;
  config: any;
  active: string = '';

  tooltip: HTMLDivElement;
  actionMap: any[] = [];
  draw: Function;
  isMove = false;
  moveStart = 0;
  moveOrigin = 0;
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
  list: DrawItems[] = [];
  data: DataItems[] = [];
  legendMap: { [k: string]: boolean } = {};
  legend: HTMLElement;
  showTooltip: Function;
  isLock = false;
  constructor(container: HTMLElement, data: DataItems[], config: any) {
    this.container = container;
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight - 20;
    container.appendChild(canvas);
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.getTypesDarkColor();
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
    document.addEventListener('pointerup', this.onMoveEnd.bind(this));
    canvas.addEventListener('pointerleave', this.onMoveEnd.bind(this));
    canvas.addEventListener('wheel', this.onScale.bind(this));

    const legend = document.createElement('div');
    legend.style.display = 'inline-flex';
    legend.style.alignItems = 'center';
    legend.style.justifyContent = 'center';
    legend.style.width = container.offsetWidth + 'px';
    legend.style.height = '20px';
    legend.style.fontSize = '12px';
    legend.style.gap = '10px';
    this.legend = legend;
    legend.addEventListener('click', this.onClickLegend.bind(this));
    this.getLegend();
    container.appendChild(legend);

    this.resizeUtil = new BaseResize(canvas, this.resizeCanvas.bind(this));
    this.draw = debounce(this.onDraw.bind(this), 100);
    this.showTooltip = debounce(this.onTooltip.bind(this), 100);
    this.data = data;
    this.setData(data);
  }
  getTypesDarkColor() {
    this.config.types.forEach((item: any) => {
      item.darkColor = getDarkColor(item.color, 0.5);
    });
  }
  onClickLegend(ev: MouseEvent) {
    const target = ev.target as HTMLElement;

    const name = target.dataset.key!;
    if (this.legendMap[name] || this.legendMap[name] === undefined) {
      this.legendMap[name] = false;
    } else {
      this.legendMap[name] = true;
    }
    this.getLegend();
    this.draw();
  }
  getLegend() {
    this.legend.innerHTML = this.config.types
      .map(
        (it: (typeof this.config.types)[0], i: number) =>
          `<span data-key="${
            it.name
          }" style="cursor:pointer;padding:0 10px;display:inline-flex;align-items:center;text-align:center"><span style="background:${
            this.legendMap[it.name] === false ? '#efefef' : it.color
          };margin-right:5px;pointer-events:none" class="tooltip-item-color"></span><span style="pointer-events:none">${
            it.name
          }</span></span>`
      )
      .join('');
  }
  //滚轮缩放
  onWheel(ev: WheelEvent) {
    if (this.isLock) return;
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

    this.active = '';
    this.tooltip.style.display = 'none';
    if (this.scale !== s) {
      this.scale = s;
      if (s === 1) {
        this.moveOffset = 0;
      } else {
        this.moveOffset = -((ev.offsetX - this.config.paddingLeft) / this.barLen) * s * this.barLen;
      }
      this.checkMove();
      this.draw();
    }
  }
  onMoveEnd(ev: PointerEvent) {
    if (this.isMove) {
      if (this.scale > 1) {
        this.draw();
      }
      if (Math.abs(ev.offsetX - this.moveOrigin) < 5) {
        this.showTooltip(ev);
      }
      this.isMove = false;
    }
  }
  onMoveStart(ev: PointerEvent) {
    this.isMove = true;
    this.moveStart = ev.offsetX;
    this.hideTooltip();
    this.moveOrigin = ev.offsetX;
  }
  //检查移动范围
  checkMove() {
    if (this.moveOffset > 0) {
      this.moveOffset = 0;
    } else if (this.moveOffset < this.barLen - this.barLen * this.scale) {
      this.moveOffset = this.barLen - this.barLen * this.scale;
    }
  }
  onHover(ev: PointerEvent) {
    if (this.isLock) return;
    const x = ev.offsetX;

    if (this.isMove && Math.abs(ev.offsetX - this.moveOrigin) >= 5) {
      this.moveOffset += (ev.offsetX - this.moveStart) * this.moveStep;

      this.checkMove();
      this.moveStart = x;
      this.active = '';
      this.tooltip.style.display = 'none';
      return;
    }
    this.showTooltip(ev);
  }
  onTooltip(ev: MouseEvent) {
    const x = ev.offsetX;
    const y = ev.offsetY;
    const tooltip = this.tooltip;
    const bound = this.canvas.getBoundingClientRect();

    for (let i = 0; i < this.actionMap.length; i++) {
      const item = this.actionMap[i];
      if (x >= item.left && x <= item.left + item.w && y >= item.top && y <= item.h + item.top) {
        if (this.active != item.id) {
          //当前悬浮条状
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
    if (this.isLock) return;
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
    this.getTypesDarkColor();
    this.legendMap = {};
    this.getLegend();
    this.draw();
  }
  setData(data: any[]) {
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;
    this.data = data;
    const list: DrawItems[] = [];
    data.forEach((item: DataItems) => {
      const draw: DrawItem[] = [];
      item.data.forEach((a: DataItem) => {
        const start = new Date(a.startTime).getTime();
        const end = new Date(a.endTime).getTime();
        const typeItem = this.config.types[a.status];
        draw.push({
          start,
          end,
          timeRange: a.timeRange,
          name: typeItem.name,
          color: typeItem.color,
          darkColor: typeItem.darkColor
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
    //向下取整点时间
    this.min = Math.floor(min / (3600 * 1000)) * 3600 * 1000;
    this.range = max - min;
    //最大缩放等级
    this.maxScale = Math.ceil((max - min) / (24 * 3600000)) + 1;

    //重置缩放等级和数据缩放移动
    this.scale = 1;
    this.moveOffset = 0;

    this.draw();
  }

  onDraw() {
    if (this.isLock) return;
    this.isLock = true;
    const op = this.config;
    const ctx = this.ctx;
    const canvas = this.canvas;

    //清空绘制内容
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //条状展示长度
    const barLen = canvas.width - op.paddingLeft - op.paddingRight;
    //条状长度
    const barLength = barLen * this.scale;

    this.barLen = barLen;

    //条状宽度
    const heightUnit = (canvas.height - op.textBottom) / this.data.length;
    const heightHalf = heightUnit * 0.5;
    //间隔
    const heightGap = (1 - op.barPercent) * heightUnit * 0.5;
    //条状宽度
    const barWidth = heightUnit * op.barPercent;

    const min = this.min,
      list = this.list;

    //清空动作收集
    this.actionMap = [];

    const range = this.range;
    //大小位置映射
    const lerp = (size: number) => {
      return this.moveOffset + ((size - min) / range) * barLength;
    };

    //字体样式
    ctx.font = `${op.fontSize}px serif`;
    ctx.fillStyle = op.fontColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    //x轴时间标签
    let step = 4;
    if (range > 24 * 3600 * 1000) {
      step = 12;
    }
    //整点时间间隔大小
    step = Math.round(step / this.scale);
    //整点时间间隔数量
    const count = Math.ceil(range / (step * 3600 * 1000));
    for (let i = 0; i <= count; i++) {
      const d = dayjs(min)
        .add(i * step, 'hour')
        .format('YYYY-MM-DD HH:mm:ss');

      const t = new Date(d).getTime();
      //时间标签格式
      let text = dayjs(t).format('HH:mm');
      if (text == '00:00') text = dayjs(t).format('MM/DD');
      //时间标签位置
      const x = lerp(t);
      //数据缩放时只绘制可视范围内容的标签文本
      if (x < 0) continue;
      if (x > barLen + 1) continue;
      //标签居中
      const textW = ctx.measureText(text).width;
      ctx.fillText(text, x + op.paddingLeft - textW * 0.5, canvas.height - op.textBottom * 0.5);
    }

    list.forEach((item: DrawItems, i: number) => {
      //y轴类目
      ctx.font = `${op.fontSize}px serif`;
      ctx.fillStyle = op.fontColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      //类目居中
      const textW = ctx.measureText(item.name).width;
      ctx.fillText(item.name, op.paddingLeft - textW - 5, heightUnit * i + heightHalf);
      //绘制时间范围条状
      item.data.forEach((a: DrawItem, j: number) => {
        //判断图例是否显示
        if (this.legendMap[a.name] === false) return;

        let x = lerp(a.start);
        let x1 = lerp(a.end);
        //数据缩放时只绘制可视范围内的矩形
        if (x < 0 && x1 < 0) return;
        else if (x > barLen) return;
        else {
          //一部分在可视范围内的调整开始结束坐标位置
          if (x < 0) {
            x = 0;
          }
          if (x1 > barLen) {
            x1 = barLen;
          }
        }

        const w = x1 - x;
        if (w <= 0) return;
        const left = op.paddingLeft + x;
        const top = heightUnit * i + heightGap;
        const id = i + '-' + j;
        //悬浮时，其他矩形变暗
        if (this.active && this.active !== id) {
          ctx.fillStyle = a.darkColor;
        } else {
          ctx.fillStyle = a.color;
        }
        ctx.fillRect(left, top, w, barWidth);

        //缓存矩形范围，用于悬浮动作判断
        if (w >= 1)
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
    this.isLock = false;
  }
  resizeCanvas() {
    this.canvas.width = this.container.offsetWidth || this.config.width;
    this.canvas.height = (this.container.offsetHeight || this.config.height) - 20;
    if (this.draw) this.draw();
  }
  destroy() {
    const canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this.onMoveStart.bind(this));
    canvas.removeEventListener('pointermove', this.onHover.bind(this));
    canvas.removeEventListener('pointerup', this.onMoveEnd.bind(this));
    document.removeEventListener('pointerup', this.onMoveEnd.bind(this));
    canvas.removeEventListener('pointerleave', this.onMoveEnd.bind(this));
    canvas.removeEventListener('wheel', this.onScale.bind(this));
    this.legend.removeEventListener('click', this.onClickLegend.bind(this));
    document.body.removeChild(this.tooltip);
    this.container.removeChild(this.legend);
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
  const count = (i % 3) + 5;
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

const container = document.getElementById('container')!;

const timeBar = new TimeRangeCanvas(container, dataList, {
  width: 800,
  height: 800,
  data: dataList,
  timeType: '24',
  paddingLeft: 40,
  textBottom: 20,
  barPercent: 0.6,
  fontSize: 12,
  fontColor: 'gray',
  paddingRight: 20,
  types
});
