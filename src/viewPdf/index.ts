import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

class ViewPDF {
  url: string;

  pdf?: pdfjsLib.PDFDocumentProxy;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pageCb: (n: number, s: number) => void;
  maxNum = 1;
  maxScale = 5;
  minScale = 0.5;
  constructor(url: string, canvas: HTMLCanvasElement, pageCb: (n: number, s: number) => void) {
    this.url = url;
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d')!;
    this.pageCb = pageCb;
  }
  async init() {
    const task = pdfjsLib.getDocument(this.url);
    const pdf = await task.promise;
    this.maxNum = pdf.numPages;
    this.pdf = pdf;
    console.log('🚀 ~ index.ts ~ ViewPDF ~ init ~ pdf:', pdf);
    this.loadPage();
    return pdf;
  }
  async loadPage(currentPage: number = 1, scale: number = 1) {
    if (
      this.pdf &&
      currentPage >= 1 &&
      currentPage <= this.maxNum &&
      scale >= this.minScale &&
      scale <= this.maxScale
    ) {
      const page = await this.pdf.getPage(currentPage);

      const viewport = page.getViewport({ scale: scale });
      const outputScale = window.devicePixelRatio || 1;

      const canvas = this.canvas;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      page.render({
        canvasContext: this.ctx,
        transform,
        viewport
      });
      this.pageCb(currentPage, scale);
    }
  }
  destroy() {
    this.pdf?.loadingTask.destroy();
    this.pdf?.destroy();
  }
}
function btnClick(id: string, cb: () => void) {
  const btn = document.getElementById(id)!;
  btn.onclick = cb;
}
async function main() {
  let current = 1;
  let scale = 1;
  const pageSpan = document.getElementById('page')!;
  const scaleSpan = document.getElementById('scale')!;

  const canvas = document.getElementById('pdfcanvas') as HTMLCanvasElement;
  const pdfviewer = new ViewPDF('./test.pdf', canvas, (n: number, s: number) => {
    current = n;
    scale = s;
    pageSpan.innerHTML = 'page=' + n;
    scaleSpan.innerHTML = `scale=` + s;
  });
  await pdfviewer.init();

  btnClick('pre', () => {
    pdfviewer.loadPage(current - 1, scale);
  });
  btnClick('next', () => {
    pdfviewer.loadPage(current + 1, scale);
  });

  btnClick('big', () => {
    pdfviewer.loadPage(current, scale + 0.5);
  });
  btnClick('small', () => {
    pdfviewer.loadPage(current, scale - 0.5);
  });
}
main();
