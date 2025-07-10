import { type CanvasDrawType, CanvasRender } from '../utils/CanvasRender';
import { nextTick } from './util';
import { debounce } from 'lodash-es';
import { SphericalMercator, type LngLatXY } from './SphericalMercator';
import { EventEmitter } from '../utils/EventEmitter';

type MapOptions = {
  center: LngLatXY;
  zoom: number;
  container: HTMLElement;
};

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
  tileSize = 256;
  container: HTMLElement;
  mark: HTMLElement;
  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  projection: typeof SphericalMercator = SphericalMercator;
  center: LngLatXY = [116.407387, 39.904179];
  zoom = 4;
  isFirst: boolean = true;
  isLock: boolean = false;
  wheelCount = 0;
  move = {
    enable: false,
    isMove: false,
    start: [0, 0],
    end: [0, 0],
    moveStep: 0.5
  };
  shapeConfig: CanvasDrawType[] = [];
  tileCenter: LngLatXY = [0, 0];
  tileStart: LngLatXY = [0, 0];
  tileEnd: LngLatXY = [0, 0];
  isDrawLayer = false;
  cacheTiles: { [n: string]: HTMLImageElement } = {};
  renderer: CanvasRender;
  options: MapOptions;
  events: EventEmitter = new EventEmitter();
  htmlOverlays: MapHtmlOptions[] = [];
  htmlBox: HtmlBoxType[] = [];
  tileUrl = 'http://wprd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}';
  constructor(options: MapOptions) {
    this.options = options;
    this.center = options.center;
    this.zoom = Math.ceil(options.zoom);
    this.container = options.container;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.renderer = new CanvasRender(this.canvas);
    this.container.appendChild(this.canvas);
    this.canvas.style.flex = 'none';
    this.overlay = this.addDom('map-overlay', 2);
    this.mark = this.addDom('map-mark', 3);
    this.resize();

    this.onListener();
  }
  private addDom(className: string, zIndex: number) {
    const dom = document.createElement('div');
    dom.className = className;
    dom.style.position = 'absolute';
    dom.style.flex = 'none';
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

    const pos = this.lnglat2Canvas(data.pos, this.zoom);
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
    if (this.mark) {
      this.mark.addEventListener('click', this.onClickMap.bind(this));
      this.mark.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.mark.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.mark.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.mark.addEventListener('mouseleave', this.onMouseUp.bind(this));
      this.mark.addEventListener('wheel', this.onWheel);
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    window.addEventListener('unload', this.offListener.bind(this));
  }
  offListener() {
    window.removeEventListener('resize', this.resize);
    if (this.container) {
      this.mark.removeEventListener('click', this.onClickMap.bind(this));
      this.mark.removeEventListener('mousedown', this.onMouseDown.bind(this));
      this.mark.removeEventListener('mousemove', this.onMouseMove.bind(this));
      this.mark.removeEventListener('mouseup', this.onMouseUp.bind(this));
      this.mark.removeEventListener('mouseleave', this.onMouseUp.bind(this));
      this.mark.removeEventListener('wheel', this.onWheel);
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
    this.events.clear();
  }
  setZoom(z: number) {
    if (z >= 3 && z <= 19) {
      this.zoom = Math.ceil(z);
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
    if (z >= 3 && z <= 19) {
      this.zoom = Math.ceil(z);
    }
    this.drawLayer();
  }
  //适配屏幕大小和边距
  fitMapView({
    zoomRange,
    startPoint,
    endPoint,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight
  }: {
    zoomRange: [number, number];
    startPoint: LngLatXY;
    endPoint: LngLatXY;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
  }) {
    const w = this.container.offsetWidth,
      h = this.container.offsetHeight;
    const viewWidth = w - (paddingLeft || 0) - (paddingRight || 0);
    const viewHeight = h - (paddingTop || 0) - (paddingBottom || 0);
    const start: LngLatXY = [Math.min(startPoint[0], endPoint[0]), Math.min(startPoint[1], endPoint[1])];
    const end: LngLatXY = [Math.max(startPoint[0], endPoint[0]), Math.max(startPoint[1], endPoint[1])];
    const center: LngLatXY = [(start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5];
    let zoom: number = 3;
    let ww = 0,
      hh = 0;
    let flag = false;

    for (zoom = zoomRange[0]; zoom <= zoomRange[1]; zoom++) {
      const p = this.projection.lnglat2px(start, zoom);

      const p1 = this.projection.lnglat2px(end, zoom);

      ww = Math.abs(p1[0] - p[0]);
      hh = Math.abs(p1[1] - p[1]);
      if (ww >= viewWidth && hh >= viewHeight) {
        flag = true;

        break;
      }
    }
    if (!flag) {
      zoom = zoomRange[1];
    }

    const c = this.projection.lnglat2px(center, zoom);
    const newCenter = this.projection.px2lnglat(
      [c[0] - (paddingLeft || 0) + (paddingRight || 0), c[1] - (paddingTop || 0) + (paddingBottom || 0)],
      zoom
    );
    this.setView(newCenter, zoom);
    return { zoom, center: newCenter };
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
    this.move.start = [ev.offsetX, ev.offsetY];
  }
  onMouseMove(ev: MouseEvent) {
    if (this.move.enable) {
      this.move.isMove = true;
      //鼠标移动后位置
      this.move.end = [ev.offsetX, ev.offsetY];
    }
  }
  onMouseUp() {
    if (this.move.enable && this.move.isMove) {
      this.move.enable = false;
      //鼠标移动的距离，乘以moveStep阻尼系数，避免移动范围太大
      const offsetx = (this.move.end[0] - this.move.start[0]) * this.move.moveStep;
      const offsety = (this.move.end[1] - this.move.start[1]) * this.move.moveStep;
      //新的中心点像素坐标=旧的中心点像素坐标-鼠标移动距离
      const newtileCenter: LngLatXY = [this.tileCenter[0] - offsetx, this.tileCenter[1] - offsety];
      //根据新的中心点像素坐标计算出新的经纬度坐标
      const center = this.projection.px2lnglat(newtileCenter, this.zoom);
      this.setCenter(center);
    }
  }

  onClickMap(ev: MouseEvent) {
    this.move.enable = false;
    if (!this.move.isMove) {
      const x = ev.offsetX;
      const y = ev.offsetY;

      const lnglat = this.projection.px2lnglat([x + this.tileStart[0], y + this.tileStart[1]], this.zoom);
      //   console.log("🚀 ~ MyMap ~ onClickMap ~ lnglat:", lnglat)

      const objs = this.renderer.checkShapes(x, y);
      //   console.log('🚀 ~ MyMap ~ onClickMap ~ objs:', objs);

      const htmls = this.checkHtmlBox(x, y);
      this.events.emit('click', { objs, lnglat, x, y, htmls });
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
  lnglat2Canvas(lnglat: LngLatXY, z: number): LngLatXY {
    const [x, y] = this.projection.lnglat2px(lnglat, z);
    return [x - this.tileStart[0], y - this.tileStart[1]];
  }
  xy2lnglat(xy: LngLatXY, zoom: number) {
    return this.projection.px2lnglat(xy, zoom);
  }
  lnglat2xy(lnglat: LngLatXY, zoom: number) {
    return this.projection.lnglat2px(lnglat, zoom);
  }

  getTileBounds() {
    //中心经纬度转像素坐标
    const tileCenter = this.projection.lnglat2px(this.center, this.zoom);
    //canvas大小
    const mapSize = this.getMapSize();
    //取一半，获取左上点和右下点相对于中心点的像素坐标
    const halfWidth = mapSize[0] * 0.5;
    const halfHeight = mapSize[1] * 0.5;
    const start: LngLatXY = [tileCenter[0] - halfWidth, tileCenter[1] - halfHeight];
    const end: LngLatXY = [tileCenter[0] + halfWidth, tileCenter[1] + halfHeight];
    //瓦片底图是256x256大小的图片，计算瓦片范围
    const bounds = [
      [Math.floor(start[0] / this.tileSize), Math.floor(start[1] / this.tileSize)],
      [Math.ceil(end[0] / this.tileSize), Math.ceil(end[1] / this.tileSize)]
    ];
    return {
      tileCenter,
      bounds,
      start,
      end,
      //瓦片开始像素坐标相对canvas可视范围的左上点像素坐标偏移
      offset: [bounds[0][0] * this.tileSize - start[0], bounds[0][1] * this.tileSize - start[1]]
    };
  }
  getTileImage(x: number, y: number, z: number) {
    return new Promise<HTMLImageElement>((resolve) => {
      const id = `${x}-${y}-${z}`;
      //缓存瓦片底图
      if (this.cacheTiles[id]) {
        resolve(this.cacheTiles[id]);
      } else {
        //加载瓦片底图
        const url = this.tileUrl.replace('{x}', String(x)).replace('{y}', String(y)).replace('{z}', String(z));
        const image = new Image();
        image.src = url;
        image.onload = () => {
          this.cacheTiles[id] = image;
          resolve(image);
        };
      }
    });
  }
  async drawTileImage(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, imageX: number, imageY: number) {
    const image = await this.getTileImage(x, y, z);
    ctx.drawImage(image, imageX, imageY);
  }
  async drawLayer() {
    if (this.isDrawLayer) return;

    this.isDrawLayer = true;
    this.renderer.clear();
    const ctx = this.ctx;
    const { offset, bounds, start, end, tileCenter } = this.getTileBounds();
    //中心点像素坐标
    this.tileCenter = tileCenter;
    //开始像素坐标
    this.tileStart = start;
    //结束像素坐标
    this.tileEnd = end;
    //收集需要绘制的瓦片索引和瓦片在canvas上的位置
    const queue = [];
    for (let x = bounds[0][0], i = 0; x < bounds[1][0]; x++, i++) {
      for (let y = bounds[0][1], j = 0; y < bounds[1][1]; y++, j++) {
        queue.push({
          x,
          y,
          imageX: i * this.tileSize + offset[0],
          imageY: j * this.tileSize + offset[1]
        });
      }
    }
    //异步加载图片绘制到canvas上，http1.1的同一个域名下TCP并发连接数4-8个，通常6个。
    for (let i = 0; i < queue.length; i = i + 6) {
      const list = queue.slice(i, i + 6);
      await Promise.all(list.map((a) => this.drawTileImage(ctx, a.x, a.y, this.zoom, a.imageX, a.imageY)));
    }
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
    const z = this.zoom;
    this.shapeConfig.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (let i = 0; i < this.shapeConfig.length; i++) {
      const op = {
        ...this.shapeConfig[i]
      };
      if (op.type === 'Circle') {
        op.center = this.lnglat2Canvas(op.center, z);
        op.radius = this.projection.meter2px(op.radius, z);
      } else if (op.type === 'Image' || op.type === 'Text') {
        op.pos = this.lnglat2Canvas(op.pos, z);
      } else if (op.type === 'Rect') {
        op.start = this.lnglat2Canvas(op.start, z);
        op.end = this.lnglat2Canvas(op.end, z);
      } else if (op.type === 'Line' || op.type === 'Polygon') {
        op.path = op.path.map((p) => this.lnglat2Canvas(p, z));
      }

      await this.renderer.draw(op);
    }
  }
}
