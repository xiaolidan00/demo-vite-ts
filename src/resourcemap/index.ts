import { debounce } from 'lodash-es';
import proj4 from 'proj4';
import chinajson from './100000.json';
import { travelGeo } from '../utils/utils';
import { createGui } from '../utils/tool';
//https://epsg.io/3857
//https://epsg.io/3415

const projection = 'EPSG:3415';
proj4.defs(
  projection,
  '+proj=lcc +lat_0=21 +lon_0=110 +lat_1=38 +lat_2=38.4 +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs'
);

type LngLatXY = [number, number];
interface MapOptions {
  container: HTMLElement;
  center?: LngLatXY;
  scale?: number;
}

class ResourceMap {
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
  onWheel: Function;
  data = { zoom: 1340, left: 263, top: 1336, lat0: 0, lat1: 23, lat2: 47, lng0: 110 };
  // data = { zoom: 1340, lat0: 21, lat1: 38, lat2: 38.4, lng0: 110, left: 0, top: -750 };
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

    this.ctx = canvas.getContext('2d')!;
    this.container.addEventListener('pointerdown', this.onMoveStart.bind(this));
    this.container.addEventListener('pointerup', this.onMoveEnd.bind(this));
    this.container.addEventListener('pointermove', this.onMove.bind(this));
    document.body.addEventListener('pointerup', this.onMoveEnd.bind(this));

    this.onWheel = debounce(this.doWheel.bind(this), 100);
    this.container.addEventListener('wheel', this.onWheel.bind(this));
    this.resize = debounce(this.onResize.bind(this), 100);
    window.addEventListener('resize', this.resize.bind(this));
    // createGui(
    //   [
    //     {
    //       name: 'zoom',
    //       type: 'number',
    //       min: 1200,
    //       max: 1350,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'left',
    //       type: 'number',
    //       min: 250,
    //       max: 300,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'top',
    //       type: 'number',
    //       min: 1320,
    //       max: 1380,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'lat0',
    //       type: 'number',
    //       min: 0,
    //       max: 30,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'lng0',
    //       type: 'number',
    //       min: 40,
    //       max: 120,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'lat1',
    //       type: 'number',
    //       min: 0,
    //       max: 90,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     },
    //     {
    //       name: 'lat2',
    //       type: 'number',
    //       min: 0,
    //       max: 90,
    //       step: 0.1,
    //       onChange: this.drawLayer.bind(this)
    //     }
    //   ],
    //   this.data
    // );

    createGui(
      [
        {
          name: 'zoom',
          type: 'number',
          min: -2000,
          max: 2000,
          step: 1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'left',
          type: 'number',
          min: -2000,
          max: 2000,
          step: 1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'top',
          type: 'number',
          min: -2000,
          max: 2000,
          step: 1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'lat0',
          type: 'number',
          min: 0,
          max: 30,
          step: 0.1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'lng0',
          type: 'number',
          min: 40,
          max: 120,
          step: 0.1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'lat1',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: this.drawLayer.bind(this)
        },
        {
          name: 'lat2',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: this.drawLayer.bind(this)
        }
      ],
      this.data
    );
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
  lnglat2px(a: [number, number]) {
    const xy = proj4(projection)
      .forward(a)
      .map((t) => t / this.data.zoom);

    return [
      this.move.offsetx + this.scaleVal * (xy[0] + this.halfWidth + this.data.left),
      this.move.offsety + this.scaleVal * (this.imageHeight - xy[1] + this.data.top)
    ];
  }
  drawGeo() {
    const data = this.data;
    proj4.defs(
      projection,
      `+proj=lcc +lat_0=${data.lat0} +lon_0=${data.lng0} +lat_1=${data.lat1} +lat_2=${data.lat2} +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs`
    );

    const ctx = this.ctx;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    travelGeo(chinajson, (path: Array<[number, number]>) => {
      ctx.beginPath();
      const p0 = this.lnglat2px(path[0]);
      ctx.moveTo(p0[0], p0[1]);
      for (let i = 1; i < path.length; i++) {
        const p = this.lnglat2px(path[i]);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }
  drawPoint() {
    this.ctx.fillStyle = 'blue';

    const xy = this.lnglat2px(this.center);
    console.log('🚀 ~ ResourceMap ~ drawPoint ~ xy:', xy);
    this.ctx.fillRect(xy[0], xy[1], 10, 10);
  }
  checkMove() {
    // console.log('🚀 ~ ResourceMap ~ checkMove ~ this.move.offsetx:', this.move.offsetx, this.move.offsety);
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
    // this.drawPoint();
    this.drawGeo();
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
}

const map = new ResourceMap({
  container: document.getElementById('container')!
});
map.init();
