import { type CanvasDrawType, CanvasRender } from '../utils/CanvasRender';
import { nextTick, travelGeo } from '../utils/utils';
import { debounce } from 'lodash-es';
import ChinaJson from '../data/100000.json';
import proj4 from 'proj4';
import { EventEmitter } from '../utils/EventEmitter';
export type LngLatXY = [number, number];
type MapOptions = {
  center?: LngLatXY;
  zoom?: number;
  container: HTMLElement;
};
class ChinaLambertProj {
  projection = 'China Lambert';
  //兰伯特投影参数
  data = {
    lat0: 0,
    lng0: 110,
    lat1: 21,
    lat2: 56.8,
    x0: 350,
    y0: -1835,
    zoom: 1300
  };
  //中国地势图图片宽高
  imageWidth = 100;
  imageHeight = 100;
  //缩放比例
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
  //设置缩放比例
  setScale(v: number) {
    this.scaleVal = v;
  }
  //经纬度转像素
  lnglat2px(a: LngLatXY) {
    const xy = proj4(this.projection)
      .forward(a)
      .map((t) => t / this.data.zoom);

    return [this.scaleVal * (xy[0] + this.imageWidth * 0.5), this.scaleVal * (this.imageHeight - xy[1])];
  }
  //像素转经纬度
  px2lnglat(a: LngLatXY) {
    const p = [
      (a[0] / this.scaleVal - this.imageWidth * 0.5) * this.data.zoom,
      (this.imageHeight - a[1] / this.scaleVal) * this.data.zoom
    ];
    return proj4(this.projection).inverse(p);
  }
  //设置图片大小
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
export class ResourceMap {
  container: HTMLElement;

  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  projection = new ChinaLambertProj();
  center: LngLatXY = [116.407387, 39.904179];
  zoom = 2;

  minZoom = 2;
  maxZoom = 20;
  isFirst: boolean = true;
  isLock: boolean = false;

  zoomStep = 0.5;
  move = {
    enable: false,
    isMove: false,
    originX: 0,
    originY: 0,
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
  image?: HTMLImageElement;
  resize: Function;
  wheel: Function;
  clickMap: Function;
  constructor(options: MapOptions) {
    this.options = options;
    if (options.center) this.center = options.center;
    if (options.zoom) {
      this.zoom = options.zoom;
      this.projection.setScale(this.zoom * 0.1);
    }
    this.container = options.container;

    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.container.offsetWidth;
    this.canvas.height = this.container.offsetHeight;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.renderer = new CanvasRender(this.canvas);
    this.container.appendChild(this.canvas);
    this.canvas.style.flex = 'none';
    this.overlay = this.addDom('map-overlay', 2);

    this.resize = debounce(this.onResize.bind(this), 100);
    this.wheel = debounce(this.onWheel.bind(this), 100);
    this.clickMap = debounce(this.onClickMap.bind(this), 100);
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

    this.setCenter(this.center);
    ////地图居中
    //  const w = this.projection.imageWidth * this.projection.scaleVal;
    // const h = this.projection.imageHeight * this.projection.scaleVal;
    // this.move.offsetX = (this.canvas.width - w) * 0.5;
    // this.move.offsetY = (this.canvas.height - h) * 0.5;
    // this.drawLayer();
  }
  private addDom(className: string, zIndex: number) {
    const dom = document.createElement('div');
    dom.className = className;
    dom.style.position = 'absolute';
    dom.style.flex = 'none';
    dom.style.pointerEvents = 'none';
    dom.style.overflow = 'hidden';
    dom.style.zIndex = String(zIndex);
    dom.style.width = this.container.offsetWidth + 'px';
    dom.style.height = this.container.offsetHeight + 'px';
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
    window.addEventListener('resize', this.resize.bind(this));
    if (this.container) {
      this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
      this.container.addEventListener('wheel', this.wheel.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    window.addEventListener('unload', this.offListener.bind(this));
  }
  offListener() {
    window.removeEventListener('resize', this.resize.bind(this));
    if (this.container) {
      this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
      this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
      this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
      this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this));
      this.container.removeEventListener('wheel', this.wheel.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
    this.events.clear();
  }
  //设置地图缩放大小
  setZoom(z: number) {
    if (z >= this.minZoom && z <= this.maxZoom) {
      this.zoom = z;

      this.projection.setScale(z * 0.1);
      this.setCenter(this.center);
    }
  }
  //设置地图中心点位置
  setCenter(center: LngLatXY) {
    if (center[0] >= -180 && center[0] <= 180 && center && center[1] >= -90 && center[1] <= 90) {
      this.center = center;
      const pos = this.projection.lnglat2px(center);
      this.move.offsetX = -pos[0] + this.canvas.width * 0.5;
      this.move.offsetY = -pos[1] + this.canvas.height * 0.5;

      this.drawLayer();
    }
  }

  onWheel(ev: WheelEvent) {
    if (ev.deltaY > 0) {
      //down
      this.setZoom(this.zoom - this.zoomStep);
    } else {
      //up
      this.setZoom(this.zoom + this.zoomStep);
    }
  }
  onMouseDown(ev: MouseEvent) {
    this.move.enable = true;
    this.move.isMove = false;
    //鼠标开始位置
    this.move.startX = ev.pageX;
    this.move.startY = ev.pageY;
    //鼠标初始位置
    this.move.originX = ev.pageX;
    this.move.originY = ev.pageY;
  }
  onMouseMove(ev: MouseEvent) {
    if (this.move.enable) {
      //鼠标移动超过5px则为移动地图
      if (Math.abs(ev.pageX - this.move.originX) >= 5 || Math.abs(ev.pageY - this.move.originY) >= 5) {
        this.move.isMove = true;
      }

      //地图移动距离XY
      this.move.offsetX += ev.pageX - this.move.startX;
      this.move.offsetY += ev.pageY - this.move.startY;
      this.move.startX = ev.pageX;
      this.move.startY = ev.pageY;
    }
  }
  onMouseUp(ev: MouseEvent) {
    //移动地图
    if (this.move.enable && this.move.isMove) {
      //计算新的中心位置
      const newcenter = this.canvas2lnglat([this.canvas.width * 0.5, this.canvas.height * 0.5]);
      this.center = newcenter;

      this.drawLayer();
    } else {
      //点击地图
      this.clickMap(ev);
    }
    this.move.isMove = false;
    this.move.enable = false;
  }
  onClickMap(ev: MouseEvent) {
    const x = ev.offsetX;
    const y = ev.offsetY;

    const lnglat = this.canvas2lnglat([x, y]);
    console.log('🚀  ~ lnglat:', x, y, lnglat);

    const objs = this.renderer.checkShapes(x, y);
    console.log('🚀  ~ objs:', objs);

    const htmls = this.checkHtmlBox(x, y);
    this.events.emit('click', { objs, lnglat, x, y, htmls });
  }
  onResize() {
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    this.overlay.style.width = w + 'px';
    this.overlay.style.height = h + 'px';
    this.canvas.width = w;
    this.canvas.height = h;
    this.drawLayer();
  }

  //经纬度转canvas上的像素坐标
  lnglat2Canvas(lnglat: LngLatXY): LngLatXY {
    const [x, y] = this.projection.lnglat2px(lnglat);
    return [x + this.move.offsetX, y + this.move.offsetY];
  }
  //canvas上的像素坐标转经纬度
  canvas2lnglat(xy: LngLatXY): LngLatXY {
    const p = this.projection.px2lnglat([xy[0] - this.move.offsetX, xy[1] - this.move.offsetY]);
    return p as LngLatXY;
  }

  async drawLayer() {
    if (this.isDrawLayer) return;

    this.isDrawLayer = true;
    this.renderer.clear();
    const ctx = this.ctx;
    ctx.drawImage(
      this.image!,
      this.move.offsetX,
      this.move.offsetY,
      this.projection.imageWidth * this.projection.scaleVal,
      this.projection.imageHeight * this.projection.scaleVal
    );
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

const resourcemap = new ResourceMap({
  container: document.getElementById('container')!,
  center: [116.407387, 39.904179],
  zoom: 2
});
resourcemap.init();
let index = 0;
//绘制中国边界
travelGeo(ChinaJson, (path: LngLatXY[], a: any) => {
  resourcemap.add({
    id: a.properties.name + ++index,
    type: 'Line',
    path: path,
    isClose: true,
    style: {
      lineColor: 'red',
      lineWidth: 3
    }
  });
});
//添加多边形
const polygon: CanvasDrawType = {
  id: 'Polygon',
  type: 'Polygon',
  path: [
    [110, 39],
    [116, 39],
    [116, 30]
  ],
  style: {
    fillColor: 'blue',
    fillOpacity: 0.5,
    lineColor: 'blue',
    lineWidth: 3
  },
  isAction: true
};
resourcemap.add(polygon);
//添加html
resourcemap.addHtml({
  type: 'html',
  content: `<div class="text-box"><div>Hello Map</div></div>`,
  pos: [116.407387, 39.904179],
  id: 'textbox',
  isAction: true
});
//监听点击动作
resourcemap.events.on('click', ({ objs, lnglat, htmls }: any) => {
  console.log('click', objs, lnglat, htmls);
  if (objs.length) {
    objs[0].style.fillColor = 'red';
    objs[0].style.lineColor = 'red';
    resourcemap.drawLayer();
  }
});
