import proj4 from 'proj4';
const projection = 'EPSG:3415';
import dat from 'dat.gui';
import { createGui } from '../utils/tool';

function travelGeo(geojson: any, cb: Function) {
  geojson.features.forEach((a: any) => {
    if (a.geometry.type === 'MultiPolygon') {
      a.geometry.coordinates.forEach((b: any) => {
        b.forEach((c: any) => {
          cb(c);
        });
      });
    } else {
      a.geometry.coordinates.forEach((c: any) => {
        cb(c);
      });
    }
  });
}
//https://epsg.io/3415

const lnglat2px = (a: [number, number]) => {
  return proj4(projection)
    .forward(a)
    .map((t) => t / 8000);
};
fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000.json')
  .then((res) => res.json())
  .then((res) => {
    const canvas = document.createElement('canvas');
    canvas.width = 850;
    canvas.height = 1000;

    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const half = canvas.width * 0.5;
    const data = {
      lat0: 21,
      lat1: 38,
      lat2: 38.4,
      lng0: 110,
      left: 28.7,
      top: 490.1
    };

    const drawGeo = () => {
      proj4.defs(
        projection,
        `+proj=lcc +lat_0=${data.lat0} +lon_0=${data.lng0} +lat_1=${data.lat1} +lat_2=${data.lat2} +ellps=WGS72 +towgs84=0,0,1.9,0,0,0.814,-0.38 +units=m +no_defs +type=crs`
      );

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      travelGeo(res, (path: Array<[number, number]>) => {
        ctx.beginPath();
        const p0 = lnglat2px(path[0]);
        ctx.moveTo(p0[0] + half, canvas.height - p0[1]);
        for (let i = 1; i < path.length; i++) {
          const p = lnglat2px(path[i]);
          ctx.lineTo(p[0] + half, canvas.height - p[1]);
        }
        ctx.closePath();
        ctx.stroke();
      });
    };

    const moveCanvas = () => {
      canvas.style.left = data.left + 'px';
      canvas.style.top = -data.top + 'px';
    };
    createGui(
      [
        {
          name: 'lat0',
          type: 'number',
          min: 0,
          max: 30,
          step: 0.1,
          onChange: drawGeo
        },
        {
          name: 'lng0',
          type: 'number',
          min: 40,
          max: 120,
          step: 0.1,
          onChange: drawGeo
        },
        {
          name: 'lat1',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: drawGeo
        },
        {
          name: 'lat2',
          type: 'number',
          min: 0,
          max: 90,
          step: 0.1,
          onChange: drawGeo
        },
        {
          name: 'left',
          type: 'number',
          min: -100,
          max: 100,
          step: 0.1,
          onChange: moveCanvas
        },
        {
          name: 'top',
          type: 'number',
          min: 90,
          max: 700,
          step: 0.1,
          onChange: moveCanvas
        }
      ],
      data
    );
    moveCanvas();
    drawGeo();
  });
