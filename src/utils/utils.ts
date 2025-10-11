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
export function nextTick() {
  return Promise.resolve();
}
export function uuid() {
  const temp_url = URL.createObjectURL(new Blob());
  const uuid = temp_url.toString(); // blob:https://xxx.com/b250d159-e1b6-4a87-9002-885d90033be3
  URL.revokeObjectURL(temp_url);
  return uuid.substr(uuid.lastIndexOf('/') + 1);
}
