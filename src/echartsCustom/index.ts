import { BaseChart } from '../utils/BaseChart';
import './tooltip.scss';
import * as echarts from 'echarts';
import { getDarkColor } from 'xcolor-helper';
import dayjs from 'dayjs';
//不同状态名称和颜色设置
const types = [
  { name: '运行', color: '#32CD32' }, // 0
  { name: '离线', color: '#808080' }, // 1
  { name: '报警', color: '#FF6347' }, // 2
  { name: '静止', color: '#1E90FF' } // 3
];
function main(dataList: any[]) {
  const data: any[] = [];
  let min = Number.MAX_SAFE_INTEGER;
  let max = 0;
  //类目
  const categories: string[] = [];

  //图表状态
  const state = {
    highlight: false,
    highlightId: ''
  };

  //组装整理数据
  dataList.forEach((item, index) => {
    categories.push(item.name);
    item.data.forEach((a: any, i: number) => {
      const typeItem = types[a.status] || types[3];
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
  //时间范围类型，24小时内还是以天为单位
  const timeType: string = max - min <= 3600 * 1000 * 24 ? '24' : 'day';

  //渲染自定义形状
  function renderItem(params: any, api: any) {
    //目录索引
    const categoryIndex = api.value(0);
    //开始坐标
    const start = api.coord([api.value(1), categoryIndex]);
    //结束坐标
    const end = api.coord([api.value(2), categoryIndex]);

    //条状宽度
    const height = api.size([0, 1])[1] * 0.6;
    //条状范围
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
    const style = api.style();
    const darkColor = getDarkColor(style.fill, 0.5);
    console.log('🚀 ~ index.ts ~ renderItem ~ state.highlight:', state.highlight);
    //矩形绘制样式与范围
    if (!state.highlight) {
      return (
        rectShape && {
          type: 'rect',
          name: '',
          transition: ['shape'],
          shape: rectShape,
          //正常效果，变暗的颜色
          style: {
            fill: style.fill
          }
        }
      );
    }

    return (
      rectShape && {
        type: 'rect',
        name: '',
        transition: ['shape'],
        shape: rectShape,
        //正常效果，变暗的颜色
        style: {
          fill: state.highlightId == api.value(4) ? style.fill : darkColor
        }
      }
    );
  }

  const option = {
    //图表内数据缩放
    dataZoom: {
      type: 'inside',
      //过滤模式为不过滤数据，只改变数轴范围。
      filterMode: 'none'
    },
    //图例不生效
    legend: { show: true, top: 0, data: types.map((it) => ({ name: it.name, itemStyle: { color: it.color } })) },
    //信息提示
    tooltip: {
      trigger: 'item',
      formatter: function (params: any) {
        const value = params.value;

        return /*html*/ `<div class="tooltip-container">
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
    //网格范围
    grid: {
      left: 40,
      top: 20,
      right: 20,
      bottom: 30
    },
    //x轴
    xAxis: {
      //坐标轴显示范围
      min,
      max,
      //最小间隔
      minInterval: 3600 * 1000,
      //间隔大小
      interval: timeType == '24' ? 3600 * 4 * 1000 : 3600 * 12 * 1000,
      axisLabel: {
        //坐标轴显示标签
        formatter: function (val: number) {
          const s = dayjs(val).format('HH:mm');
          if (s === '00:00') {
            return dayjs(val).format('MM/DD');
          }
          return s;
        }
      },
      splitLine: {
        show: false
      }
    },
    //y轴
    yAxis: {
      data: categories,
      axisLine: {
        show: false
      },
      axisTick: { show: false },
      //倒序
      inverse: true
    },
    series: [
      {
        //自定义系列
        type: 'custom',
        //生成自定义行状态
        renderItem: renderItem,
        colorBy: 'data',
        encode: {
          //x坐标轴取值维度
          x: [1, 2],
          //y坐标轴取值维度
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
    // state.highlight = true;
    // chart.chart.resize();
  });
  // chart.chart.on('downplay', (ev) => {
  //   state.highlight = false;
  //   chart.chart.resize();
  // });

  const legend = document.createElement('div');
  legend.style.display = 'inline-flex';
  legend.style.alignItems = 'center';

  legend.style.width = '800px';
  legend.style.fontSize = '12px';
  legend.style.gap = '10px';
  legend.innerHTML = types
    .map(
      (it, i) =>
        `<span data-key="${i}" style="cursor:pointer;flex:1;display:inline-flex;align-items:center;text-align:center"><span style="background:${it.color};margin-right:5px;pointer-events:none" class="tooltip-item-color"></span><span style="pointer-events:none">${it.name}</span></span>`
    )
    .join('');

  document.body.appendChild(legend);
  legend.addEventListener('click', (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    if (target) {
    }
  });
}

const totalTime = 3600 * 1000 * 24 * 3;
const dataList = [];
//生成模拟数据
for (let i = 1; i <= 5; i++) {
  const items = [];
  const count = Math.round(Math.random() * 10) + 5;
  let before = new Date('2025-01-01 00:00:00').getTime();
  let status = Math.round(Math.random() * 99) % types.length;
  const unit = totalTime / count;
  for (let j = 0; j < count; j++) {
    const t = unit + before;
    items.push({
      startTime: before,
      endTime: t,
      timeRange: Number((t - before) / 3600000).toFixed(2),
      status: status
    });
    status = (status + (Math.floor(Math.random() * 99) % 3 ? 3 : 1)) % types.length;
    before = t;
  }
  dataList.push({
    name: '设备' + i,
    data: items
  });
}
main(dataList);
