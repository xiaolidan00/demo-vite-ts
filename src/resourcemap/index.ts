import { cloneDeep, debounce } from 'lodash-es';
import { getGadientArray } from 'xcolor-helper';
import proj4 from 'proj4';
import { CanvasDrawType, CanvasRender } from '../utils/CanvasRender';
import { travelGeo } from '../utils/utils';
import { EventEmitter } from '../utils/EventEmitter';
//https://epsg.io/3857
//https://epsg.io/3415

type LngLatXY = [number, number];
interface MapOptions {
  container: HTMLElement;
  center?: LngLatXY;
  scale?: number;
}

class ResourceMap {
  projection = 'EPSG:3415';
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  resize: Function;
  center: LngLatXY = [116.3912757, 39.906217];
  scale = 2;
  scaleVal = 0.2;
  scaleStep = 0.5;
  maxScale = 20;
  minScale = 2;
  imageWidth = 100;
  imageHeight = 100;
  halfHeight = 50;
  halfWidth = 50;
  image?: HTMLImageElement;
  move = {
    x: 0,
    y: 0,
    offsetx: 0,
    offsety: 0,
    enable: false
  };
  events: EventEmitter = new EventEmitter();
  onWheel: Function;
  renderer: CanvasRender;
  idMap: { [n: string]: boolean } = {};
  data = { zoom: 1340, left: 263, top: 1336, lat0: 0, lat1: 23, lat2: 47, lng0: 110 };
  shapeConfig: CanvasDrawType[] = [];

  constructor(options: MapOptions) {
    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    this.container = options.container;
    if (options.center) this.center = options.center;
    if (options.scale) {
      this.scale = options.scale;
      this.scaleVal = options.scale * 0.1;
    }

    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.appendChild(canvas);
    this.renderer = new CanvasRender(canvas);
    this.ctx = canvas.getContext('2d')!;
    this.container.addEventListener('pointerdown', this.onMoveStart.bind(this));
    this.container.addEventListener('pointerup', this.onMoveEnd.bind(this));
    this.container.addEventListener('pointermove', this.onMove.bind(this));
    document.body.addEventListener('pointerup', this.onMoveEnd.bind(this));

    this.onWheel = debounce(this.doWheel.bind(this), 100);
    this.container.addEventListener('wheel', this.onWheel.bind(this));
    this.resize = debounce(this.onResize.bind(this), 100);
    window.addEventListener('resize', this.resize.bind(this));
    const data = this.data;
    proj4.defs(
      this.projection,
      `+proj=lcc +lat_0=${data.lat0} +lon_0=${data.lng0} +lat_1=${data.lat1} +lat_2=${data.lat2} +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs`
    );
    window.addEventListener('unload', this.destroy.bind(this));
  }

  async drawShape() {
    this.shapeConfig.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (let i = 0; i < this.shapeConfig.length; i++) {
      const op: CanvasDrawType = cloneDeep(this.shapeConfig[i]);
      if (op.type === 'Circle') {
        op.center = this.lnglat2px(op.center);
      } else if (op.type === 'Image' || op.type === 'Text') {
        op.pos = this.lnglat2px(op.pos);
      } else if (op.type === 'Rect') {
        op.start = this.lnglat2px(op.start);
        op.end = this.lnglat2px(op.end);
      } else if (op.type === 'Line' || op.type === 'Polygon') {
        op.path = op.path.map((p: LngLatXY) => this.lnglat2px(p));
      }

      await this.renderer.draw(op);
    }
  }
  doWheel(ev: WheelEvent) {
    let s = this.scale;

    if (ev.deltaY > 0) {
      //down
      s -= this.scaleStep;
      if (s < this.minScale) {
        s = this.minScale;
      }
    } else {
      //up
      s += this.scaleStep;
      if (s > this.maxScale) {
        s = this.maxScale;
      }
    }
    if (s !== this.scale) {
      const ss = s / this.scale;
      this.move.offsetx = this.move.offsetx * ss;
      this.move.offsety = this.move.offsety * ss;
      this.scale = s;
      this.scaleVal = s * 0.1;
      this.checkMove();
      this.drawLayer();
    }
  }
  lnglat2px(a: LngLatXY): LngLatXY {
    const xy = proj4(this.projection)
      .forward(a)
      .map((t) => t / this.data.zoom);

    return [
      this.move.offsetx + this.scaleVal * (xy[0] + this.halfWidth + this.data.left),
      this.move.offsety + this.scaleVal * (this.imageHeight - xy[1] + this.data.top)
    ];
  }
  add(op: CanvasDrawType) {
    if (!this.idMap[op.id]) {
      this.idMap[op.id] = true;
      this.shapeConfig.push(op);
    }
  }

  checkMove() {
    const s = this.scale * 0.1;

    const w = this.imageWidth * s;
    const h = this.imageHeight * s;

    if (w < this.canvas.width) {
      if (this.move.offsetx < 0) {
        this.move.offsetx = 0;
      } else if (this.move.offsetx > this.canvas.width - w) {
        this.move.offsetx = this.canvas.width - w;
      }
    } else {
      if (this.move.offsetx < -w + this.canvas.width) {
        this.move.offsetx = -w + this.canvas.width;
      } else if (this.move.offsetx > 0) {
        this.move.offsetx = 0;
      }
    }
    if (h < this.canvas.height) {
      if (this.move.offsety < 0) {
        this.move.offsety = 0;
      } else if (this.move.offsety > this.canvas.height - h) {
        this.move.offsety = this.canvas.height - h;
      }
    } else {
      if (this.move.offsety < -h + this.canvas.height) {
        this.move.offsety = -h + this.canvas.height;
      } else if (this.move.offsety > 0) {
        this.move.offsety = 0;
      }
    }
  }
  onMoveStart(ev: PointerEvent) {
    this.move.enable = true;
    this.move.x = ev.offsetX;
    this.move.y = ev.offsetY;
  }
  onMove(ev: PointerEvent) {
    if (this.move.enable) {
      this.move.offsetx += ev.offsetX - this.move.x;
      this.move.offsety += ev.offsetY - this.move.y;
      this.move.x = ev.offsetX;
      this.move.y = ev.offsetY;
    }
  }
  onMoveEnd(ev: PointerEvent) {
    if (this.move.enable) {
      this.move.enable = false;
      this.checkMove();
      this.drawLayer();
    } else {
      const x = ev.offsetX;
      const y = ev.offsetY;
      const objs = this.renderer.checkShapes(x, y);
      this.events.emit('click', { objs, x, y, ev });
    }
  }
  async init() {
    this.image = await this.getMapImage();
    this.onResize();

    this.drawLayer();
  }
  drawLayer() {
    if (this.image) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.drawImage(
        this.image,
        // this.move.offsetx,
        // this.move.offsety,
        // this.canvas.width,
        // this.canvas.height,
        this.move.offsetx,
        this.move.offsety,
        this.imageWidth * this.scaleVal,
        this.imageHeight * this.scaleVal
      );
    }
    this.drawShape();
  }

  onResize() {
    this.canvas.width = this.container.offsetWidth;
    this.canvas.height = this.container.offsetHeight;

    this.checkMove();
    this.drawLayer();
  }
  getMapImage() {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.src = './map.JPG';
      image.onload = () => {
        this.imageWidth = image.naturalWidth;
        this.imageHeight = image.naturalHeight;
        this.halfWidth = this.imageWidth * 0.5;
        this.halfHeight = this.imageHeight * 0.5;
        resolve(image);
      };
    });
  }
  destroy() {
    this.shapeConfig = [];
    this.container.removeEventListener('pointerdown', this.onMoveStart.bind(this));
    this.container.removeEventListener('pointerup', this.onMoveEnd.bind(this));
    this.container.removeEventListener('pointermove', this.onMove.bind(this));

    this.container.removeEventListener('wheel', this.onWheel.bind(this));

    window.removeEventListener('resize', this.resize.bind(this));
  }
}

const map = new ResourceMap({
  container: document.getElementById('container')!
});
map.init();

console.log('🚀 ~ index.ts ~ map.events.on ~ map:', map);
map.events.on('click', ({ objs }: { objs: CanvasDrawType[] }) => {
  console.log('🚀 ~ index.ts ~ map.events.on ~ objs:', objs);
});

fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
  .then((res) => res.json())
  .then((res) => {
    const labelMap: { [n: string]: boolean } = {};

    const colors = getGadientArray('#00BFFF', '#0000CD', 10);
    let index = 0;
    const textStyle = {
      fontSize: 14,
      fillColor: 'white',
      fillShadowBlurStyle: {
        shadowColor: '#4169E1',
        shadowBlur: 10
      }
    };
    const shapeStyle = {
      fillShadowBlurStyle: {
        shadowColor: '#4169E1',
        shadowBlur: 10
      }
    };
    const textList: CanvasDrawType[] = [];
    travelGeo(res, (path: LngLatXY[], a: any) => {
      const n = a.properties.name as string;
      map.add({
        id: index,

        name: n,
        isAction: true,
        type: 'Polygon',
        path,
        style: {
          fillColor: colors[index % colors.length],

          ...shapeStyle
        }
      });
      index++;

      if (!labelMap[n] && n && a.properties.center) {
        labelMap[n] = true;
        textList.push({
          id: 'text' + index,
          name: n,
          text: n,
          style: textStyle,
          type: 'Text',
          pos: a.properties.center,
          zIndex: index
        });
        textList.push({
          id: 'texta' + index,
          name: n,
          text: index + '',
          style: textStyle,
          type: 'Text',
          pos: a.properties.center,
          zIndex: index,
          offsetY: 16
        });
      }
    });
    textList.forEach((item) => {
      map.add(item);
    });

    map.drawLayer();
    console.log('🚀 ~ index.ts ~ travelGeo ~ index:', index);
  });
