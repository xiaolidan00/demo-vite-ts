import ExcelJs from 'exceljs';
import { getBlob } from '../utils/utils';
import 'normalize.css';
class ViewExcel {
  url: string;
  workbook?: ExcelJs.Workbook;
  sheet?: ExcelJs.Worksheet;
  sheetCb: (index: number) => void;
  constructor(url: string, sheetCb: (index: number) => void) {
    this.url = url;
    this.sheetCb = sheetCb;
  }

  init() {
    return new Promise<ExcelJs.Workbook>((resolve) => {
      getBlob(this.url).then((file) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
          const book = new ExcelJs.Workbook();
          book.xlsx.load(reader.result as ExcelJs.Buffer).then((workbook) => {
            this.workbook = workbook;
            this.loadSheet();
            resolve(workbook);
          });
        };
      });
    });
  }
  loadSheet(n: number = 1) {
    const workbook = this.workbook;
    if (workbook && n >= 1 && n <= workbook.worksheets.length) {
      this.sheet = workbook.getWorksheet(n)!;

      this.sheetCb(n);
    }
  }
  getTable() {
    if (this.sheet) {
      let table = '';
      this.sheet.eachRow((row) => {
        let tr = '';
        row.eachCell((cell) => {
          let v = cell.value;
          if (v === undefined || v === null) {
            v = '';
          }
          tr += `<td>${v}</td>`;
        });
        table += `<tr>${tr}</tr>`;
      });
      return `<table border="1">${table}</table>`;
    }
    return '';
  }
}
async function main() {
  const tableContent = document.getElementById('content')!;
  const sheetContainer = document.getElementById('sheet')!;

  const excelViewer = new ViewExcel('./test.xlsx', (index) => {
    tableContent.innerHTML = excelViewer.getTable();
    const sheetSpans = excelViewer
      .workbook!.worksheets.map(
        (item, i) => `<span data-index="${i + 1}" class="${index === i + 1 ? 'active' : ''}">${item.name}</span>`
      )
      .join('');
    sheetContainer.innerHTML = sheetSpans;
  });
  await excelViewer.init();

  sheetContainer.onclick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    const index = Number(target.dataset.index);
    excelViewer.loadSheet(index);
  };
}
main();
