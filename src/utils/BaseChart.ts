import { debounce } from 'lodash-es';
import type { ECharts } from 'echarts';
import * as echarts from 'echarts';
export class BaseChart {
  chart: ECharts;
  resize: Function;
  el: HTMLDivElement;
  resizeObserver: ResizeObserver;
  option: any;
  constructor(el: HTMLDivElement) {
    this.el = el;
    this.chart = echarts.init(el);
    this.resize = debounce(this.onResize.bind(this), 100);
    document.addEventListener('resize', this.resize.bind(this));
    document.addEventListener('fullscreenchange', this.resize.bind(this));
    this.resizeObserver = new ResizeObserver(this.resize.bind(this));
    this.resizeObserver.observe(el);
  }

  setOption(option: any) {
    if (this.chart) {
      this.chart.clear();
      if (option) {
        this.chart.setOption(option);
        this.option = option;
      }
      this.resize();
    }
  }

  onResize() {
    if (this.chart) this.chart.resize();
  }
  destroy() {
    document.removeEventListener('resize', this.resize.bind(this));
    document.removeEventListener('fullscreenchange', this.resize.bind(this));
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this.el);
      this.resizeObserver.disconnect();
    }
  }
}
