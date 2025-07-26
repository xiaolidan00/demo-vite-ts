import { type CanvasDrawType, CanvasRender } from '../utils/CanvasRender';
import { nextTick } from '../utils/utils';
import { debounce } from 'lodash-es';
import ChinaJson from '../data/100000.json';
import proj4 from 'proj4';
import { EventEmitter } from '../utils/EventEmitter';
export type LngLatXY = [number, number];
type MapOptions = {
  center: LngLatXY;
  zoom: number;
  container: HTMLElement;
};
class ChinaLambertProj {
  projection = 'China Lambert';
  data = {
    lat0: 0,
    lng0: 110,
    lat1: 21,
    lat2: 56.8,
    x0: 350,
    y0: -1835,
    zoom: 1300
  };
  imageWidth = 100;
  imageHeight = 100;
  scaleVal = 0.2;
  constructor() {
    const data = this.data;
    proj4.defs(
      this.projection,
      `+proj=lcc +lat_0=${data.lat0} +lon_0=${data.lng0} +lat_1=${data.lat1} +lat_2=${data.lat2} +x_0=${
        data.x0 * 1000
      } +y_0=${data.y0 * 1000} +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs`
    );
  }
  setScale(v: number) {
    this.scaleVal = v;
  }
  lnglat2px(a: LngLatXY) {
    const xy = proj4(this.projection)
      .forward(a)
      .map((t) => t / this.data.zoom);

    return [this.scaleVal * (xy[0] + this.imageWidth * 0.5), this.scaleVal * (this.imageHeight - xy[1])];
  }
  px2lnglat(a: LngLatXY) {
    const p = [
      (a[0] / this.scaleVal - this.imageWidth * 0.5) * this.data.zoom,
      (this.imageHeight - a[1] / this.scaleVal) * this.data.zoom
    ];
    return proj4(this.projection).inverse(p);
  }
  setImageSize(w: number, h: number) {
    this.imageWidth = w;
    this.imageHeight = h;
  }
}
export type MapHtmlOverlay = {
  type: 'html';
  content: string;
  pos: LngLatXY;
  offset?: LngLatXY;
  id: string | number;
  hidden?: boolean;
  name?: string;
  anchor?:
    | 'left-top'
    | 'left-middle'
    | 'left-bottom'
    | 'right-top'
    | 'right-middle'
    | 'right-bottom'
    | 'center-top'
    | 'center-bottom'
    | 'center-middle';
  isAction?: boolean;
};
export type MapHtmlOptions = {
  data: MapHtmlOverlay;
  dom: HTMLDivElement;
};
export type HtmlBoxType = { start: LngLatXY; end: LngLatXY } & MapHtmlOptions;
export class MyMap {
  container: HTMLElement;

  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  projection = new ChinaLambertProj();
  center: LngLatXY = [116.407387, 39.904179];
  zoom = 2;
  scaleVal = 0.2;
  minZoom = 2;
  maxZoom = 20;
  isFirst: boolean = true;
  isLock: boolean = false;
  wheelCount = 0;
  move = {
    enable: false,
    isMove: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moveStep: 0.5
  };
  shapeConfig: CanvasDrawType[] = [];

  isDrawLayer = false;
  cacheTiles: { [n: string]: HTMLImageElement } = {};
  renderer: CanvasRender;
  options: MapOptions;
  events: EventEmitter = new EventEmitter();
  htmlOverlays: MapHtmlOptions[] = [];
  htmlBox: HtmlBoxType[] = [];
  image?: HTMLElement;
  constructor(options: MapOptions) {
    this.options = options;
    this.center = options.center;
    this.zoom = options.zoom;
    this.container = options.container;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.renderer = new CanvasRender(this.canvas);
    this.container.appendChild(this.canvas);
    this.canvas.style.flex = 'none';
    this.overlay = this.addDom('map-overlay', 2);

    this.resize();

    this.onListener();
  }
  loadImage() {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.src = '../assets/map.JPG';
      image.onload = () => {
        this.projection.setImageSize(image.naturalWidth, image.naturalHeight);

        resolve(image);
      };
    });
  }
  async init() {
    const image = await this.loadImage();
    this.image = image;
  }
  private addDom(className: string, zIndex: number) {
    const dom = document.createElement('div');
    dom.className = className;
    dom.style.position = 'absolute';
    dom.style.flex = 'none';
    dom.style.pointerEvents = 'none';
    dom.style.overflow = 'hidden';
    dom.style.zIndex = String(zIndex);
    this.container.appendChild(dom);
    return dom;
  }

  async addHtml(data: MapHtmlOverlay) {
    const dom = document.createElement('div');
    dom.style.position = 'absolute';
    dom.style.display = 'inline-block';
    this.overlay.appendChild(dom);
    const item = { data, dom };
    this.htmlOverlays.push(item);
    await this.updateHtml(item);
  }
  async updateHtml({ data, dom }: MapHtmlOptions) {
    dom.innerHTML = data.content;
    await nextTick();

    const pos = this.lnglat2Canvas(data.pos);
    const offset = data.offset || [0, 0];
    const w = dom.offsetWidth;
    const h = dom.offsetHeight;
    let x = 0;
    let y = 0;
    //锚点位置
    const anchor = data.anchor || 'center-bottom';
    switch (anchor) {
      case 'left-middle':
        y = h * 0.5;
        break;
      case 'left-bottom':
        y = h;
        break;
      case 'right-top':
        x = w;
        break;
      case 'right-middle':
        x = w;
        y = h * 0.5;
        break;
      case 'right-bottom':
        x = w;
        y = h;
        break;
      case 'center-top':
        x = w * 0.5;
        break;
      case 'center-middle':
        x = w * 0.5;
        break;
      case 'center-bottom':
        x = w * 0.5;
        y = h;
        break;
    }

    const left = pos[0] - x + (offset[0] || 0);
    const top = pos[1] - y + (offset[1] || 0);
    //设置dom位置
    dom.style.left = left + 'px';
    dom.style.top = top + 'px';

    const start: LngLatXY = [left, top];
    const end: LngLatXY = [left + dom.offsetWidth, top + dom.offsetHeight];
    const box: HtmlBoxType = { start, end, dom, data };
    //元素隐藏
    if (data.hidden) {
      dom.style.display = 'none';
      return;
    } else {
      dom.style.display = '';
    }
    //收集html范围，用于事件监听
    if (
      data.isAction &&
      ((end[0] >= 0 && end[1] >= 0) || (start[0] <= this.canvas.width && start[1] <= this.canvas.height))
    ) {
      this.htmlBox.push(box);
    }
  }
  //检测点是否在html内
  checkHtmlBox(x: number, y: number) {
    const objs: MapHtmlOptions[] = [];
    this.htmlBox.forEach((a) => {
      if (x >= a.start[0] && x <= a.end[0] && y >= a.start[1] && y <= a.end[1]) {
        objs.push({ data: a.data, dom: a.dom });
      }
    });
    return objs;
  }
  //更新html
  async renderHtml() {
    //清空可视范围内的htmlbox
    this.htmlBox = [];
    for (let i = 0; i < this.htmlOverlays.length; i++) {
      await this.updateHtml(this.htmlOverlays[i]);
    }
  }
  onListener() {
    window.addEventListener('resize', this.resize);
    if (this.container) {
      this.container.addEventListener('click', this.onClickMap.bind(this));
      this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
      this.container.addEventListener('wheel', this.onWheel);
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    window.addEventListener('unload', this.offListener.bind(this));
  }
  offListener() {
    window.removeEventListener('resize', this.resize);
    if (this.container) {
      this.container.removeEventListener('click', this.onClickMap.bind(this));
      this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
      this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
      this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
      this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this));
      this.container.removeEventListener('wheel', this.onWheel);
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
    this.events.clear();
  }
  setZoom(z: number) {
    if (z >= this.minZoom && z <= this.maxZoom) {
      this.drawLayer();
    }
  }
  setCenter(center: LngLatXY) {
    if (center[0] >= -180 && center[0] <= 180 && center && center[1] >= -90 && center[1] <= 90) {
      this.center = center;
      this.drawLayer();
    }
  }
  setView(center: LngLatXY, z: number) {
    if (center[0] >= -180 && center[0] <= 180 && center && center[1] >= -90 && center[1] <= 90) {
      this.center = center;
    }
    if (z >= this.minZoom && z <= this.maxZoom) {
      this.zoom = z;
    }
    this.drawLayer();
  }

  onWheel = debounce(
    function (ev: WheelEvent) {
      console.log('🚀 ~ MyMap ~ onWheel ~ ev:', ev, ev.deltaY);
      if (ev.deltaY > 0) {
        //down
        this.setZoom(this.zoom - 1);
      } else {
        //up
        this.setZoom(this.zoom + 1);
      }
    }.bind(this),
    100
  );
  onMouseDown(ev: MouseEvent) {
    this.move.enable = true;
    this.move.isMove = false;
    //鼠标开始位置
    this.move.startX = ev.pageX;
    this.move.startY = ev.pageY;
  }
  onMouseMove(ev: MouseEvent) {
    if (this.move.enable) {
      this.move.isMove = true;
      //鼠标移动后位置
      this.move.offsetX += ev.pageX - this.move.startX;
      this.move.offsetY += ev.pageY - this.move.startY;
      this.move.startX = ev.pageX;
      this.move.startY = ev.pageY;
    }
  }
  onMouseUp() {
    if (this.move.enable && this.move.isMove) {
      this.move.enable = false;
    }
  }

  onClickMap(ev: MouseEvent) {
    this.move.enable = false;
    if (!this.move.isMove) {
      const x = ev.offsetX;
      const y = ev.offsetY;

      // const lnglat = this.projection.px2lnglat([x + this.tileStart[0], y + this.tileStart[1]], this.zoom);
      // //   console.log("🚀 ~ MyMap ~ onClickMap ~ lnglat:", lnglat)

      // const objs = this.renderer.checkShapes(x, y);
      // //   console.log('🚀 ~ MyMap ~ onClickMap ~ objs:', objs);

      // const htmls = this.checkHtmlBox(x, y);
      // this.events.emit('click', { objs, lnglat, x, y, htmls });
    }
  }

  resize = debounce(
    function () {
      const size = this.getMapSize();

      this.mark.style.width = size[0] + 'px';
      this.mark.style.height = size[1] + 'px';
      this.overlay.style.width = size[0] + 'px';
      this.overlay.style.height = size[1] + 'px';
      this.canvas.width = size[0];
      this.canvas.height = size[1];
      this.drawLayer();
    }.bind(this),
    this.isFirst ? 0 : 100
  );
  getMapSize() {
    return [this.container.clientWidth, this.container.clientHeight];
  }
  //经纬度转canvas上的像素坐标
  lnglat2Canvas(lnglat: LngLatXY): LngLatXY {
    const [x, y] = this.projection.lnglat2px(lnglat);
    return [x + this.move.offsetX, y + this.move.offsetY];
  }
  canvas2lnglat(xy: LngLatXY) {
    const p = this.projection.lnglat2px(xy);
    return [p[0] - this.move.offsetX, p[1] - this.move.offsetY];
  }
  xy2lnglat(xy: LngLatXY) {
    return this.projection.px2lnglat(xy);
  }
  lnglat2xy(lnglat: LngLatXY) {
    return this.projection.lnglat2px(lnglat);
  }

  async drawLayer() {
    if (this.isDrawLayer) return;

    this.isDrawLayer = true;
    this.renderer.clear();
    const ctx = this.ctx;
    ctx.drawImage(image, 0, 0, this.imageWidth * this.scaleVal, this.imageHeight * this.scaleVal);
    this.isDrawLayer = false;
    this.isFirst = false;
    this.drawShape();
    this.renderHtml();
  }
  //添加到形状配置到地图
  add(op: CanvasDrawType | MapHtmlOverlay) {
    if (op.type === 'html') {
      this.addHtml(op);
    } else {
      this.shapeConfig.push(op);
    }
  }
  //根据id移除形状
  removeById(id: string) {
    this.shapeConfig = this.shapeConfig.filter((it) => it.id === id);
  }
  //根据name移除形状
  removeByName(name: string) {
    this.shapeConfig = this.shapeConfig.filter((it) => it.name === name);
  }
  async drawShape() {
    this.shapeConfig.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (let i = 0; i < this.shapeConfig.length; i++) {
      const op = {
        ...this.shapeConfig[i]
      };
      if (op.type === 'Circle') {
        op.center = this.lnglat2Canvas(op.center);
      } else if (op.type === 'Image' || op.type === 'Text') {
        op.pos = this.lnglat2Canvas(op.pos);
      } else if (op.type === 'Rect') {
        op.start = this.lnglat2Canvas(op.start);
        op.end = this.lnglat2Canvas(op.end);
      } else if (op.type === 'Line' || op.type === 'Polygon') {
        op.path = op.path.map((p) => this.lnglat2Canvas(p));
      }

      await this.renderer.draw(op);
    }
  }
}
