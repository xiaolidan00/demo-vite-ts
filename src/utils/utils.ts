export function getBlob(url: string) {
  return new Promise<Blob>((resolve, reject) => {
    fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then((res) => {
        resolve(res.blob());
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export function travelGeo(geojson: any, cb: Function) {
  geojson.features.forEach((a: any) => {
    if (a.geometry.type === 'MultiPolygon') {
      a.geometry.coordinates.forEach((b: any) => {
        b.forEach((c: any) => {
          cb(c, a);
        });
      });
    } else {
      a.geometry.coordinates.forEach((c: any) => {
        cb(c, a);
      });
    }
  });
}
