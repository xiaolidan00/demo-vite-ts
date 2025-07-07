import { debounce } from 'lodash-es';
import proj4 from 'proj4';
//https://epsg.io/3857
//https://epsg.io/3415
proj4.defs('EPSG:3415', '+proj=lcc +lat_0=0 +lon_0=110 +lat_1=25 +lat_2=47 +ellps=WGS84 +units=m +no_defs +type=crs');
const xy = proj4('EPSG:3415').forward([116, 39]);
console.log(xy.map((it) => it / 16000));
console.log(proj4('EPSG:3415').inverse(xy));
console.log(proj4('EPSG:3415').forward([110, 25]));
console.log(proj4('EPSG:3415').forward([70, 25]));
console.log(proj4('EPSG:3415').forward([140, 25]));
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
  scaleStep = 0.5;
  maxScale = 20;
  minScale = 2;
  imageWidth = 100;
  imageHeight = 100;
  image?: HTMLImageElement;
  move = {
    x: 0,
    y: 0,
    offsetx: 0,
    offsety: 0,
    enable: false
  };
  onWheel: Function;
  constructor(options: MapOptions) {
    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    this.container = options.container;
    if (options.center) this.center = options.center;
    if (options.scale) this.scale = options.scale;

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
      this.checkMove();
      this.drawLayer();
    }
  }
  drawPoint() {
    this.ctx.fillStyle = 'blue';
    const c = proj4('EPSG:3415')
      .forward(this.center)
      .map((a) => a / 16000);
    const s = this.scale * 0.1;
    console.log('🚀 ~ index.ts ~ ResourceMap ~ drawPoint ~ c:');

    const xy = [
      this.move.offsetx + (c[0] + (this.imageWidth - 218 * 2) * 0.5 + 218) * s,
      this.move.offsety + (240 + (this.imageHeight - 240 * 2) - c[1]) * s
    ];
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
        this.imageWidth * this.scale * 0.1,
        this.imageHeight * this.scale * 0.1
      );
    }
    this.drawPoint();
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
        resolve(image);
      };
    });
  }
}

const map = new ResourceMap({
  container: document.getElementById('container')!
});
map.init();
