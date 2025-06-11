import { getColor } from 'xcolor-helper';

type LineConfig = {
  //开始节点ID
  startId: string;
  //结束节点ID
  endId: string;
  //连线类型 'bezierCurve'贝塞尔曲线  'line'直线
  lineType: 'bezierCurve' | 'line';
  //连线颜色
  lineColor: string;
  //小球发光宽度
  blurWidth: number;
  //连线宽度
  lineWidth: number;
  //小球数量
  pointNum: number;
  //小球大小
  pointSize: number;
  //移动速度
  moveStep: number;
};
type NodeConfig = {
  //节点ID
  id: string;
  //x坐标
  x: number;
  //y坐标
  y: number;
  //字体大小
  fontSize: number;
  //边距
  padding: number;
  //文本内容
  text: string;
  //文本颜色
  fontColor: string;
  //节点颜色
  lineColor: string;
  //线宽
  lineWidth: number;
  //文本宽度
  textWidth?: number;
  //上下左右包围框
  box?: { left: number; right: number; top: number; bottom: number };
  //四个中心点，左中，右中，上中，下中
  points?: number[][];
  //节点高度
  height?: number;
};
class CanvasLines {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  nodes: Array<NodeConfig>;
  lines: Array<LineConfig>;
  bg: string;
  animate: number = 0;
  nodeMap: { [n: string]: NodeConfig } = {};
  infoMap: { [n: string]: number } = {};
  isMove = false;
  targetId: string = '';
  constructor(op: {
    el: HTMLCanvasElement;
    nodes: Array<NodeConfig>;
    lines: Array<LineConfig>;
    bg: string;
    width: number;
    height: number;
  }) {
    this.canvas = op.el;
    this.canvas.width = op.width;
    this.canvas.height = op.height;
    this.ctx = op.el.getContext('2d')!;
    this.nodes = op.nodes;
    this.lines = op.lines;
    this.bg = op.bg;
    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this));
    window.addEventListener('unload', this.destory.bind(this));
  }
  //鼠标按下，遍历节点，获取选中节点
  onMouseDown(e: PointerEvent) {
    const x = e.offsetX;
    const y = e.offsetY;
    //从后往前遍历节点，后面添加的节点在上面
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const box = this.nodes[i].box!;
      //鼠标在节点范围内
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        //设置选中节点ID
        this.targetId = this.nodes[i].id;
        //开启移动
        this.isMove = true;
        //设置鼠标样式
        this.canvas.style.cursor = 'move';
        break;
      }
    }
  }
  //鼠标移动，修改节点的坐标
  onMouseMove(e: PointerEvent) {
    if (this.isMove && this.targetId) {
      const node = this.nodeMap[this.targetId];
      //将鼠标位置设置成节点位置中心位置
      node.x = e.offsetX - node.textWidth! * 0.5;
      node.y = e.offsetY - node.height! * 0.5;
    }
  }
  //鼠标抬起
  onMouseUp() {
    //置空选中节点ID
    this.targetId = '';
    //关闭移动
    this.isMove = false;
    //鼠标样式恢复默认
    this.canvas.style.cursor = 'default';
  }
  clear() {
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  draw() {
    this.clear();
    this.nodes.forEach((p) => {
      this.drawNode(p);
    });
    this.lines.forEach((l) => {
      this.drawLine(l);
    });
    this.animate = requestAnimationFrame(this.draw.bind(this));
  }
  destory() {
    cancelAnimationFrame(this.animate);
    this.canvas.removeEventListener('pointerdown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('pointermove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('pointerup', this.onMouseUp.bind(this));
  }
  drawNode(t: NodeConfig) {
    const ctx = this.ctx;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = t.lineColor;
    ctx.lineWidth = t.lineWidth;

    const height = t.fontSize + t.padding * 2 + t.lineWidth * 2;
    const r = height * 0.5;
    //设置文本样式
    ctx.font = t.fontSize + 'px Arial';
    //文本宽度
    const textWidth = ctx.measureText(t.text).width || 0;
    //中心y坐标
    const cy = t.y + r;
    //左半圆心x坐标
    const cx = t.x - t.lineWidth;
    //右半圆心x坐标
    const cx1 = t.x + textWidth;
    ctx.beginPath();
    //左边半圆
    ctx.arc(cx, cy, r, 0.5 * Math.PI, 1.5 * Math.PI);
    //上边
    ctx.moveTo(cx, t.y);
    ctx.lineTo(cx1, t.y);
    //右边半圆
    ctx.arc(cx1, cy, r, 1.5 * Math.PI, 0.5 * Math.PI);
    //下边
    ctx.lineTo(cx, cy + r);
    //绘制外框
    ctx.stroke();

    //从左到右的渐变
    const grd = ctx.createLinearGradient(cx - r, cy, cx1 + r, cy);
    const c = getColor(t.lineColor);
    grd.addColorStop(0, `rgba(${c.red},${c.green},${c.blue},0.8)`);
    grd.addColorStop(1, `rgba(${c.red},${c.green},${c.blue},0)`);
    ctx.fillStyle = grd;
    ctx.fill();

    //设置字体颜色
    ctx.fillStyle = t.fontColor;
    //绘制字体
    ctx.fillText(t.text, t.x, cy + t.fontSize * 0.5 - t.lineWidth);
    //缓存一些信息
    t.textWidth = textWidth;
    t.height = height;
    //包围框范围
    t.box = {
      left: t.x - t.lineWidth - r,
      right: t.x + textWidth + r + t.lineWidth,
      top: t.y - t.lineWidth,
      bottom: t.y + height + t.lineWidth
    };
    //四个中心点位置
    t.points = this.getPoint(t);

    this.nodeMap[t.id] = t;
  }

  getDistance(p1: number[], p2: number[]) {
    return Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2);
  }
  //四个中心点，左中，右中，上中，下中
  getPoint(t: NodeConfig) {
    const height = t.height!;
    const r = height * 0.5;
    const textWidth = t.textWidth || 0;
    const box = t.box || {
      left: t.x - t.lineWidth - r,
      right: t.x + textWidth + r + t.lineWidth,
      top: t.y - t.lineWidth,
      bottom: t.y + height + t.lineWidth
    };
    return [
      [box.left, t.y + r],
      [box.right, t.y + r],
      [t.x + textWidth * 0.5, box.top],
      [t.x + textWidth * 0.5, box.bottom]
    ];
  }
  //根据起点和终点节点的中心点，计算最短距离的两点的中心点位置
  getStartEnd(start: NodeConfig, end: NodeConfig) {
    const s = start.points || this.getPoint(start);
    const e = end.points || this.getPoint(end);
    let min = Number.MAX_SAFE_INTEGER;
    let minS = 0,
      minE = 0;
    for (let i = 0; i < s.length; i++) {
      for (let j = 0; j < e.length; j++) {
        const d = this.getDistance(s[i], e[j]);
        if (min >= d) {
          min = d;
          minS = i;
          minE = j;
        }
      }
    }

    return {
      start: { x: s[minS][0], y: s[minS][1] },
      end: { x: e[minE][0], y: e[minE][1] }
    };
  }

  drawLine(point: LineConfig) {
    const ctx = this.ctx;

    const startNode = this.nodeMap[point.startId];
    const endNode = this.nodeMap[point.endId];
    const { start, end } = this.getStartEnd(startNode, endNode);
    //连线ID
    const lineId = point.startId + '-' + point.endId;
    //小球运动变量
    const move = (this.infoMap[lineId] || 0) + point.moveStep;
    //设置连线样式
    const c = getColor(point.lineColor);
    ctx.beginPath();
    ctx.shadowBlur = 0;
    //连线线宽
    ctx.lineWidth = point.lineWidth;
    //连线颜色
    ctx.strokeStyle = `rgba(${c.red},${c.green},${c.blue},0.3)`;
    //三次贝塞尔曲线
    if (point.lineType === 'bezierCurve') {
      const cx = (start.x + end.x) * 0.5;
      //控制点1
      const p0 = {
        x: cx,
        y: start.y
      };
      //控制点2
      const p1 = {
        x: cx,
        y: end.y
      };

      //移动到起点
      ctx.moveTo(start.x, start.y);
      //绘制曲线
      ctx.bezierCurveTo(cx, start.y, cx, end.y, end.x, end.y);

      ctx.stroke();

      //均分连线绘制小球
      const unit = 1 / point.pointNum;

      //小球发光宽度
      ctx.shadowBlur = point.blurWidth;
      //小球发光颜色
      ctx.shadowColor = point.lineColor;
      //小球颜色
      ctx.fillStyle = point.lineColor;

      for (let i = 0; i <= 1; i = i + unit) {
        //循环移动
        const s = (i + move) % 1;
        const a = 1 - s;
        //计算三次贝塞尔曲线中小球的坐标
        const x =
          start.x * Math.pow(a, 3) +
          3 * s * Math.pow(a, 2) * p0.x +
          3 * Math.pow(s, 2) * a * p1.x +
          Math.pow(s, 3) * end.x;
        const y =
          start.y * Math.pow(a, 3) +
          3 * s * Math.pow(a, 2) * p0.y +
          3 * Math.pow(s, 2) * a * p1.y +
          Math.pow(s, 3) * end.y;

        //绘制小球
        ctx.beginPath();

        ctx.arc(x, y, point.pointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (point.lineType === 'line') {
      //移动到起点
      ctx.moveTo(start.x, start.y);
      //绘制直线
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      //均分连线绘制小球
      const unit = 1 / point.pointNum;
      //两点x坐标范围
      const xSize = end.x - start.x;
      //两点y坐标范围
      const ySize = end.y - start.y;

      //小球发光宽度
      ctx.shadowBlur = point.blurWidth;
      //小球发光颜色
      ctx.shadowColor = point.lineColor;
      //小球颜色
      ctx.fillStyle = point.lineColor;

      for (let i = 0; i <= 1; i = i + unit) {
        //循环移动
        const s = (i + move) % 1;
        //计算直线中小球的坐标
        const x = start.x + xSize * s;
        const y = start.y + ySize * s;
        //绘制小球
        ctx.beginPath();
        ctx.arc(x, y, point.pointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    this.infoMap[lineId] = move;
  }
}

const cLine = new CanvasLines({
  //画布DOM
  el: document.getElementById('myCanvas') as HTMLCanvasElement,
  //背景颜色
  bg: '#505050',
  //画布大小
  height: 800,
  width: 800,
  //节点数据
  nodes: [
    {
      id: 'a',
      x: 100,
      y: 200,
      text: '开始节点A',
      fontSize: 14,
      padding: 4,
      fontColor: 'white',
      lineColor: '#b1e2f1',
      lineWidth: 2
    },
    {
      id: 'b',
      x: 600,
      y: 350,
      text: '结束节点B',
      fontSize: 14,
      padding: 4,
      fontColor: 'white',
      lineColor: '#b1e2f1',
      lineWidth: 2
    },
    {
      id: 'c',
      x: 500,
      y: 400,
      text: '开始节点C',
      fontSize: 14,
      padding: 4,
      fontColor: 'white',
      lineColor: '#ffd700',
      lineWidth: 2
    },
    {
      id: 'd',
      x: 200,
      y: 650,
      text: '结束节点D',
      fontSize: 14,
      padding: 4,
      fontColor: 'white',
      lineColor: '#ffd700',
      lineWidth: 2
    },
    {
      id: 'e',
      x: 500,
      y: 650,
      text: '结束节点E',
      fontSize: 14,
      padding: 4,
      fontColor: 'white',
      lineColor: '#ffd700',
      lineWidth: 2
    }
  ],
  //连线数据
  lines: [
    {
      startId: 'a',
      endId: 'b',
      lineType: 'bezierCurve',
      lineColor: '#b1e2f1',
      blurWidth: 10,
      lineWidth: 4,

      pointNum: 5,
      pointSize: 6,
      moveStep: 0.005
    },
    {
      startId: 'c',
      endId: 'd',
      lineType: 'line',
      lineColor: '#ffd700',
      blurWidth: 10,
      lineWidth: 4,
      pointNum: 5,
      pointSize: 6,
      moveStep: 0.005
    },
    {
      startId: 'c',
      endId: 'e',
      lineType: 'line',
      lineColor: '#ffd700',
      blurWidth: 10,
      lineWidth: 4,
      pointNum: 5,
      pointSize: 6,
      moveStep: 0.005
    }
  ]
});
//绘制关系图
cLine.draw();
