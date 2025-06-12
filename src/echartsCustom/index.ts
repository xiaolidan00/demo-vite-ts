import { BaseChart } from '../utils/BaseChart';
import './tooltip.scss';
import { getColor } from 'xcolor-helper';
import * as echarts from 'echarts';
import mockData from './mock.json';
import dayjs from 'dayjs';
const types = [
  { name: '停止', color: '#C9CDD4' }, // 0
  { name: '运行', color: '#00B42A' }, // 1
  { name: '故障', color: '#F53F3F' }, // 2
  { name: '未知', color: '#FF7D00' } // 3
];
function main() {
  const timeType = '24';
  const data: any[] = [];
  let min = new Date().getTime();
  let max = 0;
  let currentId = '';

  const categories: string[] = [];

  mockData.reverse().forEach(function (item, index) {
    categories.push(item.name);
    item.data.forEach((a: any, i) => {
      const typeItem = types[a.pumpWaterSituation] || types[3];
      const start = new Date(a.startTime).getTime();
      const end = new Date(a.endTime).getTime();
      min = Math.min(start, min);
      max = Math.max(max, end);
      data.push({
        name: typeItem.name,
        value: [index, start, end, a.timeRange, index + '-' + i],
        itemStyle: {
          color: typeItem.color
        }
      });
    });
  });
  function renderItem(params: any, api: any) {
    const categoryIndex = api.value(0);

    const id = api.value(4);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);

    //bar-width
    const height = api.size([0, 1])[1] * 0.6;
    const rectShape = echarts.graphic.clipRectByRect(
      {
        x: start[0],
        y: start[1] - height / 2,
        width: end[0] - start[0],
        height: height
      },
      {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height
      }
    );
    //     {
    //     "fill": "#FF7D00",
    //     "textPosition": "inside",
    //     "textDistance": 5,
    //     "fontStyle": "normal",
    //     "fontWeight": "normal",
    //     "fontSize": 12,
    //     "fontFamily": "Microsoft YaHei",
    //     "textFill": "#fff",
    //     "textStroke": "#FF7D00",
    //     "textStrokeWidth": 2,
    //     "text": null,
    //     "legacy": true
    // }
    if (currentId) {
      return (
        rectShape && {
          type: 'rect',
          transition: ['shape'],
          shape: rectShape,
          style: currentId == id ? api.style() : api.style({ opacity: 0.1 })
        }
      );
    } else {
      return (
        rectShape && {
          type: 'rect',
          transition: ['shape'],
          shape: rectShape,
          style: api.style()
        }
      );
    }
  }
  const option = {
    tooltip: {
      formatter: function (params: any) {
        const value = params.value;

        return `<div class="tooltip-container">
        <div class="tooltip-item">
        <span class="tooltip-item-color" style="background:${params.color}"></span>
        <span class="tooltip-item-name " >${params.name}
      </span>  <span style="color:#009ea1;">${Number(value[3]).toFixed(2)}</span>小时
        </div>
         <div class="tooltip-item">
           <span class="tooltip-item-name " >开始时间：</span>
           <span class="tooltip-item-value " >${dayjs(value[1]).format('YYYY-MM-DD HH:mm:ss')}</span>
         </div>
          <div class="tooltip-item">
           <span class="tooltip-item-name " >结束时间：</span>
           <span class="tooltip-item-value " >${dayjs(value[2]).format('YYYY-MM-DD HH:mm:ss')}</span>
         </div> 
        </div>`;
      }
    },
    grid: {
      left: 30,
      top: 20,
      right: 20,
      bottom: 50
    },
    xAxis: {
      min,
      max,
      axisLabel: {
        formatter: function (val: number) {
          if (timeType === '24') {
            return dayjs(val).format('HH:mm');
          } else {
            return dayjs(val).format('MM/DD');
          }
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      data: categories,
      axisLine: {
        show: false
      },
      axisTick: { show: false }
    },
    series: [
      {
        type: 'custom',
        renderItem: renderItem,

        colorBy: 'data',
        legendHoverLink: true,
        encode: {
          x: [1, 2],
          y: 0
        },
        data: data
      }
    ]
  };
  const el = document.createElement('div');
  el.style.width = '800px';
  el.style.height = '800px';
  document.body.appendChild(el);
  const chart = new BaseChart(el);
  chart.setOption(option);
  chart.chart.on('mouseover', (ev) => {
    console.log('🚀 ~ index.ts ~ chart.chart.on ~ ev:', ev);
    const value = ev.value as any[];
    currentId = value[4];
    chart.setOption(option);
  });
}
main();
