import mammoth from 'mammoth';
import { getBlob } from '../utils/utils';
import 'normalize.css';

class ViewDoc {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  init() {
    return new Promise<any>((resolve) => {
      getBlob(this.url).then((file) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
          const result = mammoth.convertToHtml(
            { arrayBuffer: reader.result },
            {
              convertImage: mammoth.images.imgElement(function (image) {
                return image.read('base64').then(function (imageBuffer) {
                  return {
                    src: 'data:' + image.contentType + ';base64,' + imageBuffer
                  };
                });
              })
            }
          );
          console.log('🚀 ~ index.ts ~ ViewDoc ~ getBlob ~ result:', result);
          resolve(result);
        };
      });
    });
  }
}
