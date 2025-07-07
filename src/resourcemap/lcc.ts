interface LccConfig {
  lat1: number;
  lat2: number;
  lng0: number;
}

function sec(a: number) {
  return 1 / Math.cos(a);
}
function ln(a: number) {
  return Math.log10(a) / Math.log10(Math.E);
}
function cot(a: number) {
  return 1 / Math.tan(a);
}
const EARTH_R = 6371000;
//https://mathworld.wolfram.com/LambertConformalConicProjection.html
class Lcc {
  config: LccConfig;
  constructor(config: LccConfig) {
    this.config = config;
  }
  deg2rad(a: number) {
    return a * (Math.PI / 180);
  }
  rad2deg(a: number) {
    return a * (180 / Math.PI);
  }
  lnglat2px(lng: number, lat: number) {
    const { lat1, lat2, lng0 } = this.config;
    const PI4 = 0.25 * Math.PI;
    const lat0r = 0;
    const lat1r = this.deg2rad(lat1);
    const lat2r = this.deg2rad(lat2);
    const lng0r = this.deg2rad(lng0);
    const latr = this.deg2rad(lat);
    const lngr = this.deg2rad(lng);

    const n = ln(Math.cos(lat1r) * sec(lat2r)) / ln(Math.tan(PI4 + 0.5 * lat2r) * cot(PI4 + 0.5 * lat1r));
    const F = (Math.cos(lat1r) * Math.pow(Math.tan(PI4 + 0.5 * lat1r), n)) / n;
    const p = EARTH_R * F * Math.pow(cot(PI4 + 0.5 * latr), n);
    const p0 = F * Math.pow(cot(PI4 + 0.5 * lat0r), n);
    const x = p * Math.sin(n * (lngr - lng0r));
    const y = p0 - p * Math.cos(n * (lngr - lng0r));
    return [x, y];
  }
  px2lnglat(x: number, y: number) {
    const { lat1, lat2, lng0 } = this.config;
    const PI4 = 0.25 * Math.PI;
    const lat0r = 0;
    const lat1r = this.deg2rad(lat1);
    const lat2r = this.deg2rad(lat2);
    const lng0r = this.deg2rad(lng0);

    const n = ln(Math.cos(lat1r) * sec(lat2r)) / ln(Math.tan(PI4 + 0.5 * lat2r) * cot(PI4 + 0.5 * lat1r));
    const F = (Math.cos(lat1r) * Math.pow(Math.tan(PI4 + 0.5 * lat1r), n)) / n;
    const p0 = F * Math.pow(cot(PI4 + 0.5 * lat0r), n);
    const p = Math.sign(n) * Math.sqrt(Math.pow(x, 2) + Math.pow(p0 - y, 2));
    const th = Math.pow(Math.tan(x / (p0 - y)), -1);
    const latr = 2 * Math.pow(Math.tan(Math.pow(F / p, 1 / n)), -1) - 0.5 * Math.PI;
    const lngr = lng0r + th / n;
    return [this.rad2deg(lngr), this.rad2deg(latr)];
  }
}

export const lcc = new Lcc({ lat1: 25, lat2: 47, lng0: 105 });
