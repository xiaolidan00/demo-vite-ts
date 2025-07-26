import proj4 from 'proj4';
import ChinaJson from '../data/100000.json';
import { createGui } from '../utils/tool';

import { travelGeo } from '../utils/utils';
//https://epsg.io/3857
// proj4.defs(
//   'EPSG:3857',
//   '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
// );
// const p = proj4('EPSG:3857').forward([116, 39]);
// console.log(p);
// console.log(proj4('EPSG:3857').inverse(p));

class LambertProj {
  projection = 'China Lambert';
  // data = {
  //   lat0: 0,
  //   lng0: 105,
  //   lat1: 25,
  //   lat2: 47,
  //   left: -1,
  //   top: 43,
  //   zoom: 6706
  // };
  data = {
    lat0: 0,
    lng0: 110,
    lat1: 21,
    lat2: 56.8,
    left: 53,
    top: 68,
    zoom: 6451
  };
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image?: HTMLImageElement;
  imageWidth = 100;
  imageHeight = 100;
  half = 100;
  constructor() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
  }
  async init() {
    const image = await this.loadImage();
    this.image = image;
    this.imageWidth = image.naturalWidth * 0.2;
    this.imageHeight = image.naturalHeight * 0.2;

    const half = this.imageWidth * 0.5;
    this.half = half;
    this.gui();
    this.drawGeo();
  }
  drawGeo() {
    const image = this.image!;
    const data = this.data;
    const canvas = this.canvas;
    const ctx = this.ctx;
    const half = this.half;
    proj4.defs(
      this.projection,
      `+proj=lcc +lat_0=${data.lat0} +lon_0=${data.lng0} +lat_1=${data.lat1} +lat_2=${data.lat2} +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs`
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //绘制底图
    ctx.drawImage(image, 0, 0, this.imageWidth, this.imageHeight);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    //中国边界
    travelGeo(ChinaJson, (path: Array<[number, number]>) => {
      ctx.beginPath();
      const p0 = this.lnglat2px(path[0]);
      ctx.moveTo(data.left + p0[0] + half, data.top + canvas.height - p0[1]);
      for (let i = 1; i < path.length; i++) {
        const p = this.lnglat2px(path[i]);
        ctx.lineTo(data.left + p[0] + half, data.top + canvas.height - p[1]);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }
  gui() {
    createGui(
      [
        {
          //原点纬度
          name: 'lat0',
          type: 'number',
          min: 0,
          max: 30,
          step: 0.1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //原点经度
          name: 'lng0',
          type: 'number',
          min: 40,
          max: 120,
          step: 0.1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //第一条纬线纬度
          name: 'lat1',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //第二条纬线纬度
          name: 'lat2',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //左偏移量
          name: 'left',
          type: 'number',
          min: -100,
          max: 100,
          step: 1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //上偏移量
          name: 'top',
          type: 'number',
          min: -100,
          max: 100,
          step: 1,
          onChange: this.drawGeo.bind(this)
        },
        {
          //缩放等级
          name: 'zoom',
          type: 'number',
          min: 5000,
          max: 8000,
          step: 1,
          onChange: this.drawGeo.bind(this)
        }
      ],
      this.data
    );
  }
  loadImage() {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.src = '../assets/map.JPG';
      image.onload = () => {
        resolve(image);
      };
    });
  }

  lnglat2px(a: [number, number]) {
    return proj4(this.projection)
      .forward(a)
      .map((t) => t / this.data.zoom);
  }
}

const lambert = new LambertProj();
lambert.init();
