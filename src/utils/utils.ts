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
