import { type CanvasDrawType, CanvasRender } from './CanvasRender';

type LngLatXY = [number, number];
class Transformation {
  private _a: number;
  private _b: number;
  private _c: number;
  private _d: number;
  constructor(a: number, b: number, c: number, d: number) {
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
  }
  untransform(xy: LngLatXY, scale: number) {
    scale = scale || 1;
    const x = (xy[0] / scale - this._b) / this._a;
    const y = (xy[1] / scale - this._d) / this._c;
    return [x, y];
  }
  transform(xy: LngLatXY, scale: number) {
    scale = scale || 1;
    const x = scale * (this._a * xy[0] + this._b);
    const y = scale * (this._c * xy[1] + this._d);
    return [x, y];
  }
}
const SphericalMercator = {
  R: 6378137,
  MAX_LATITUDE: 85.0511287798,
  bounds: (function () {
    const d = 6378137 * Math.PI;
    return [
      [-d, -d],
      [d, d]
    ];
  })(),
  transformation: (function () {
    const scale = 0.5 / (Math.PI * 6378137);
    return new Transformation(scale, 0.5, -scale, 0.5);
  })(),
  project(lnglat: LngLatXY): LngLatXY {
    const d = Math.PI / 180,
      max = this.MAX_LATITUDE,
      lat = Math.max(Math.min(max, lnglat[1]), -max),
      sin = Math.sin(lat * d);

    return [this.R * lnglat[0] * d, (this.R * Math.log((1 + sin) / (1 - sin))) / 2];
  },

  unproject(xy: LngLatXY): LngLatXY {
    const d = 180 / Math.PI;
    const lat = (2 * Math.atan(Math.exp(xy[1] / this.R)) - Math.PI / 2) * d;
    const lng = (xy[0] * d) / this.R;

    return [lng, lat];
  },
  scale(zoom: number) {
    return 256 * Math.pow(2, zoom);
  },
  zoom(scale: number) {
    return Math.log(scale / 256) / Math.LN2;
  },

  lnglat2px(lnglat: LngLatXY, zoom: number): LngLatXY {
    const p = this.project(lnglat);
    const scale = this.scale(zoom);
    return this.transformation.transform(p, scale);
  },
  px2lnglat(xy: LngLatXY, zoom: number): LngLatXY {
    const scale = this.scale(zoom);
    const p = this.transformation.untransform(xy, scale);
    return this.unproject(p);
  },
  meter2px(meter: number, zoom: number) {
    //地球周长
    const chang = Math.PI * 2 * this.R;
    const scale = this.scale(zoom);
    const s = scale / chang;

    return meter * s;
  }
};
const pos = SphericalMercator.lnglat2px([110, 39], 4);
console.log('🚀 ~ pos:', pos);
const pp = SphericalMercator.px2lnglat(pos, 4);
console.log('🚀 ~ pp:', pp);

function debounce(fn: Function, time: number) {
  let timeout: any; // 创建一个标记用来存放定时器的返回值
  return function () {
    if (timeout) clearTimeout(timeout); // 每当用户输入的时候把前一个 setTimeout clear 掉
    timeout = setTimeout(() => {
      // 然后又创建一个新的 setTimeout, 这样就能保证输入字符后的 interval 间隔内如果还有字符输入的话，就不会执行 fn 函数
      fn.apply(this, arguments);
    }, time);
  };
}
type MapOptions = {
  center: LngLatXY;
  zoom: number;
  container: HTMLElement;
};

class MyMap {
  tileSize = 256;
  container: HTMLElement;
  mark: HTMLElement;
  canvas: HTMLCanvasElement;
  projection = SphericalMercator;
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
  tileUrl = 'http://wprd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}';
  constructor(options: MapOptions) {
    this.center = options.center;
    this.zoom = options.zoom;
    this.container = options.container;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.canvas = document.createElement('canvas');
    this.renderer = new CanvasRender(this.canvas);
    this.container.appendChild(this.canvas);
    this.canvas.style.flex = 'none';
    this.mark = document.createElement('div');
    this.mark.style.position = 'relative';
    this.mark.style.flex = 'none';
    this.mark.style.zIndex = '2';
    this.container.appendChild(this.mark);
    this.resize();

    this.onListener();
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
  }
  setZoom(z: number) {
    if (z >= 3 && z <= 19) {
      this.zoom = z;
      this.drawLayer();
      console.log(z);
    }
  }
  setCenter(center: LngLatXY) {
    if (center[0] >= -180 && center[0] <= 180 && center && center[1] >= -90 && center[1] <= 90) {
      this.center = center;
      this.drawLayer();
    }
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
    this.move.start = [ev.offsetX, ev.offsetY];
  }
  onMouseMove(ev: MouseEvent) {
    if (this.move.enable) {
      this.move.isMove = true;
      this.move.end = [ev.offsetX, ev.offsetY];
    }
  }
  onMouseUp() {
    if (this.move.enable && this.move.isMove) {
      this.move.enable = false;
      const offsetx = (this.move.end[0] - this.move.start[0]) * this.move.moveStep;
      const offsety = (this.move.end[1] - this.move.start[1]) * this.move.moveStep;
      const newtileCenter: LngLatXY = [this.tileCenter[0] - offsetx, this.tileCenter[1] - offsety];

      this.center = this.projection.px2lnglat(newtileCenter, this.getZoom());
      this.drawLayer();
    }
  }
  lnglat2Canvas(lnglat: LngLatXY, z: number): LngLatXY {
    const [x, y] = this.projection.lnglat2px(lnglat, z);
    return [x - this.tileStart[0], y - this.tileStart[1]];
  }
  onClickMap(ev: MouseEvent) {
    this.move.enable = false;
    if (!this.move.isMove) {
      const x = ev.offsetX;
      const y = ev.offsetY;
      const zoom = this.getZoom();
      const lnglat = this.projection.px2lnglat(
        [x + this.tileStart[0], y + this.tileStart[1]],
        zoom
      );
      console.log(lnglat);
      const objs = this.renderer.checkShapes(x, y);
      console.log('🚀 ~ MyMap ~ onClickMap ~ objs:', objs);
    }
  }

  resize = debounce(
    function () {
      const size = this.getMapSize();
      this.mark.style.top = -size[1] + 'px';
      this.mark.style.width = size[0] + 'px';
      this.mark.style.height = size[1] + 'px';
      this.canvas.width = size[0];
      this.canvas.height = size[1];
      this.drawLayer();
    }.bind(this),
    this.isFirst ? 0 : 100
  );
  getMapSize() {
    return [this.container.clientWidth, this.container.clientHeight];
  }
  getZoom() {
    return this.zoom;
  }
  getCeilZoom() {
    return Math.ceil(this.zoom);
  }

  getTileImage(x: number, y: number, z: number) {
    return new Promise<HTMLImageElement>((resolve) => {
      const id = `${x}-${y}-${z}`;
      if (this.cacheTiles[id]) {
        resolve(this.cacheTiles[id]);
      } else {
        const url = this.tileUrl
          .replace('{x}', String(x))
          .replace('{y}', String(y))
          .replace('{z}', String(z));
        const image = new Image();
        image.src = url;
        image.onload = () => {
          this.cacheTiles[id] = image;
          resolve(image);
        };
      }
    });
  }
  xy2lnglat(xy: LngLatXY, zoom: number) {
    return this.projection.px2lnglat(xy, zoom);
  }
  lnglat2xy(lnglat: LngLatXY, zoom: number) {
    return this.projection.lnglat2px(lnglat, zoom);
  }

  getTileBounds(zoom: number) {
    const tileCenter = this.projection.lnglat2px(this.center, zoom);
    this.tileCenter = tileCenter;
    const mapSize = this.getMapSize();
    const halfWidth = mapSize[0] * 0.5;
    const halfHeight = mapSize[1] * 0.5;
    const start: LngLatXY = [tileCenter[0] - halfWidth, tileCenter[1] - halfHeight];
    const end: LngLatXY = [tileCenter[0] + halfWidth, tileCenter[1] + halfHeight];
    const bounds = [
      [Math.floor(start[0] / this.tileSize), Math.floor(start[1] / this.tileSize)],
      [Math.ceil(end[0] / this.tileSize), Math.ceil(end[1] / this.tileSize)]
    ];
    return {
      bounds,
      start,
      end,
      offset: [bounds[0][0] * this.tileSize - start[0], bounds[0][1] * this.tileSize - start[1]]
    };
  }
  async drawTileImage(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    z: number,
    imageX: number,
    imageY: number
  ) {
    const image = await this.getTileImage(x, y, z);
    ctx.drawImage(image, imageX, imageY);
  }
  async drawLayer() {
    if (this.isDrawLayer) return;

    this.isDrawLayer = true;
    this.renderer.clear();
    console.log('🚀drawLayer');
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    const z = this.getZoom();
    const { offset, bounds, start, end } = this.getTileBounds(z);
    this.tileStart = start;
    this.tileEnd = end;
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
    for (let i = 0; i < queue.length; i = i + 6) {
      const list = queue.slice(i, i + 6);

      await Promise.all(list.map((a) => this.drawTileImage(ctx, a.x, a.y, z, a.imageX, a.imageY)));
    }
    this.isDrawLayer = false;
    this.isFirst = false;
    this.drawShape();
  }
  add(op: CanvasDrawType) {
    this.shapeConfig.push(op);
  }
  async drawShape() {
    const z = this.getCeilZoom();
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
const map = new MyMap({
  container: document.getElementById('map') as HTMLElement,
  zoom: 18,
  center: [116.407387, 39.904179]
});
map.add({
  id: '333',
  type: 'Image',
  pos: [116.407387, 39.903],
  url: 'location.png',
  // height: 32,
  // width: 32,
  isAction: true
});
map.add({
  id: '111',
  type: 'Circle',
  center: [116.407387, 39.904179],
  radius: 50,
  style: {
    fillColor: 'red',
    fillOpacity: 0.5
  },
  isAction: true
});

map.add({
  id: 'rect',
  type: 'Rect',
  start: [116.408, 39.904179],
  end: [116.409, 39.9045],
  style: {
    fillColor: 'yellow',
    fillOpacity: 0.5
  },
  isAction: true
});

map.add({
  id: '222',
  type: 'Text',
  pos: [116.406, 39.904179],
  text: 'Hello World',

  style: {
    fontSize: 30,
    fillColor: 'green',
    fillOpacity: 0.5
  },
  isAction: true
});

map.add({
  id: 'line',
  type: 'Line',
  path: [
    [116.407, 39.904179],
    [116.4085, 39.904179],
    [116.4085, 39.905]
  ],

  style: {
    lineColor: 'blue',
    lineWidth: 3
  },
  isAction: true
});

map.add({
  id: 'polygon',
  type: 'Polygon',
  path: [
    [116.407, 39.905],
    [116.4085, 39.905],
    [116.4085, 39.906]
  ],

  style: {
    fillColor: 'blue',
    fillOpacity: 0.5
  },
  isAction: true
});
