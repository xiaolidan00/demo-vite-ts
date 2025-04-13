export type PxXY = [number, number];
export type ShadowBlurStyle = {
  /**@description  阴影模糊颜色 */
  shadowColor?: string;
  /**@description  阴影模糊,当值大于0时绘制  */
  shadowBlur?: number;
  /**@description  阴影模糊偏移x */
  shadowOffsetX?: number;
  /**@description 阴影模糊偏移y */
  shadowOffsetY?: number;
};
export type LineStyle = {
  /**@description 描边颜色，当值大于0时绘制  */
  lineColor?: string;
  /**@description 描边不透明度 */
  lineOpacity?: number;
  /**@description 描边宽度，当值大于0时绘制  */
  lineWidth?: number;
  lineShadowBlurStyle?: ShadowBlurStyle;
  /**@description 虚线间距，当值大于0时绘制 */
  dashWidth?: [number, number];
};
export type ShapeStyle = {
  /**@description 填充颜色  */
  fillColor?: string;
  /**@description 填充不透明度 */
  fillOpacity?: number;
  fillShadowBlurStyle?: ShadowBlurStyle;
} & LineStyle;
export type TextStyle = {
  /**@description 文本横向对齐 */
  //   textAlign: 'center' | 'left' | 'right';
  /**@description 文本大小 */
  fontSize?: number;
  /**@description 字体 */
  fontFamily?: string;
  /**@description 文本纵向对齐 */
  //   textBaseline: 'top' | 'middle' | 'bottom';
} & ShapeStyle;
export type CommonCanvasType = {
  id: string | number;
  name?: string;
  isAction?: boolean;
  zIndex?: number;
};
export type CanvasPolygon = CommonCanvasType & {
  type: 'Polygon';
  path: PxXY[];
  style: ShapeStyle;
};
export type CanvasLine = CommonCanvasType & {
  type: 'Line';
  path: PxXY[];
  style: LineStyle;
};

export type CanvasText = CommonCanvasType & {
  type: 'Text';
  pos: PxXY;
  text: string;
  offsetX?: number;
  offsetY?: number;
  style: TextStyle;
};
export type CanvasCircle = CommonCanvasType & {
  type: 'Circle';
  center: PxXY;
  radius: number;
  style: ShapeStyle;
};
export type CanvasRect = CommonCanvasType & {
  type: 'Rect';
  start: PxXY;
  end: PxXY;

  style: ShapeStyle;
};
export type CanvasImage = CommonCanvasType & {
  type: 'Image';
  url: string;
  pos: PxXY;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
};
export type CanvasDrawType = CanvasImage | CanvasRect | CanvasText | CanvasCircle | CanvasPolygon | CanvasLine;
export type BoxMapType = {
  start: PxXY;
  end: PxXY;
  data: CanvasDrawType;
};
const PI2 = Math.PI * 2;
/**@description 射线算法，判断点是否在多边形内 */
function isPointInPolygon(pt: PxXY, pts: PxXY[]) {
  // 交点个数
  let counter = 0;
  // 水平射线和多边形边的交点x坐标
  let xinters;
  // 线段起点和终点
  let p1, p2;
  // for循环
  for (let i = 0; i < pts.length; i++) {
    p1 = pts[i];
    p2 = pts[(i + 1) % pts.length]; // 最后一个点等于起点pts[0]
    if (pt[1] > Math.min(p1[1], p2[1]) && pt[1] <= Math.max(p1[1], p2[1])) {
      xinters = ((pt[1] - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0];
      if (p1[1] == p2[1] || pt[0] <= xinters) {
        counter++;
      }
    }
  }
  if (counter % 2 == 0) {
    return false;
  } else {
    return true;
  }
}

export class CanvasRender {
  ctx: CanvasRenderingContext2D;
  cacheImage: { [n: string]: HTMLImageElement } = {};
  boxMap: BoxMapType[] = [];
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }
  clear() {
    this.ctx.globalAlpha = 1;
    const canvas = this.canvas;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.boxMap = [];
  }

  async draw(op: CanvasDrawType) {
    this.resetStyle();
    switch (op.type) {
      case 'Circle':
        this.drawCircle(op);
        break;

      case 'Text':
        this.drawText(op);
        break;
      case 'Polygon':
        this.drawPolygon(op);
        break;
      case 'Line':
        this.drawLine(op);
        break;
      case 'Rect':
        this.drawRect(op);
        break;
      case 'Image':
        await this.drawImage(op);
        break;
    }
  }

  setShadowBlur(sb: ShadowBlurStyle) {
    if (sb.shadowBlur) {
      this.ctx.shadowBlur = sb.shadowBlur;
      if (sb.shadowOffsetX) {
        this.ctx.shadowOffsetX = sb.shadowOffsetX;
      }
      if (sb.shadowOffsetY) {
        this.ctx.shadowOffsetY = sb.shadowOffsetY;
      }
      if (sb.shadowColor) {
        this.ctx.shadowColor = sb.shadowColor;
      }
    }
  }
  setShapeStyle(style: ShapeStyle) {
    if (style.fillColor) {
      this.ctx.fillStyle = style.fillColor;
      if (style.fillOpacity !== undefined) {
        this.ctx.globalAlpha = style.fillOpacity;
      }
    }

    const sb = style.fillShadowBlurStyle;
    if (sb) this.setShadowBlur(sb);
  }
  setLineStyle(style: LineStyle) {
    if (style.lineWidth && style.lineColor) {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.lineWidth = style.lineWidth;
      this.ctx.strokeStyle = style.lineColor;
      if (style.dashWidth) {
        this.ctx.setLineDash(style.dashWidth);
      }

      const sb = style.lineShadowBlurStyle;
      if (sb) this.setShadowBlur(sb);

      if (style.lineOpacity !== undefined) {
        this.ctx.globalAlpha = style.lineOpacity;
      }
    }
  }
  resetStyle() {
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
    this.ctx.lineWidth = 0;
  }
  loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve) => {
      //缓存图片
      if (this.cacheImage[url]) {
        resolve(this.cacheImage[url]);
      } else {
        //加载图片
        const image = new Image();
        image.crossOrigin = '*';
        image.src = url;
        // image.naturalHeight;
        // image.naturalWidth;
        image.onload = () => {
          this.cacheImage[url] = image;
          resolve(image);
        };
      }
    });
  }
  async drawImage(op: CanvasImage) {
    const image = await this.loadImage(op.url);
    const w = op.width ? Math.ceil(op.width * 0.5) : Math.ceil(image.naturalWidth * 0.5);
    const h = op.height ? Math.ceil(op.height * 0.5) : Math.ceil(image.naturalHeight * 0.5);
    const x = op.offsetX ? op.pos[0] + op.offsetX : op.pos[0];
    const y = op.offsetY ? op.pos[1] + op.offsetY : op.pos[1];
    if (op.height && op.width) {
      this.ctx.drawImage(image, x - w, y - h, op.width, op.height);
    } else {
      this.ctx.drawImage(image, x - w, y - h);
    }
    this.setBoxMap([x - w, y - h], [x + w, y + h], op);
  }
  setBoxMap(start: PxXY, end: PxXY, data: CanvasDrawType) {
    //收集形状元素范围，用于后续事件监听
    if (
      data.isAction &&
      ((end[0] >= 0 && end[1] >= 0) || (start[0] <= this.canvas.width && start[1] <= this.canvas.height))
    ) {
      const item = { start, end, data, id: data.id };

      this.boxMap.push(item);
    }
  }
  drawCircle(op: CanvasCircle) {
    this.ctx.beginPath();
    const x = op.center[0];
    const y = op.center[1];
    this.ctx.arc(x, y, op.radius, 0, PI2);

    const style = op.style;
    const lineWidth = style.lineWidth || 0;
    if (style.fillColor) {
      this.setShapeStyle(style);
      this.ctx.fill();
    }
    if (style.lineWidth && style.lineColor) {
      this.setLineStyle(style);
      this.ctx.stroke();
    }
    this.setBoxMap(
      [x - op.radius - lineWidth, y - op.radius - lineWidth],
      [x + op.radius + lineWidth, y + op.radius + lineWidth],
      op
    );
  }
  drawRect(op: CanvasRect) {
    const startX = Math.min(op.start[0], op.end[0]);
    const startY = Math.min(op.start[1], op.end[1]);
    const endX = Math.max(op.start[0], op.end[0]);
    const endY = Math.max(op.start[1], op.end[1]);
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.lineTo(startX, endY);
    this.ctx.closePath();

    const style = op.style;
    const lineWidth = style.lineWidth || 0;
    if (style.fillColor) {
      this.setShapeStyle(style);
      this.ctx.fill();
    }
    if (style.lineWidth && style.lineColor) {
      this.setLineStyle(style);
      this.ctx.stroke();
    }

    this.setBoxMap([startX - lineWidth, startY - lineWidth], [endX + lineWidth, endY + lineWidth], op);
  }
  drawPolygonOrLine(op: CanvasPolygon | CanvasLine) {
    this.ctx.beginPath();
    const bound = {
      minx: Number.MAX_VALUE,
      miny: Number.MAX_VALUE,
      maxx: 0,
      maxy: 0
    };
    const start = op.path[0];
    this.ctx.moveTo(start[0], start[1]);
    bound.minx = Math.min(bound.minx, start[0]);
    bound.miny = Math.min(bound.miny, start[1]);
    bound.maxx = Math.max(bound.maxx, start[0]);
    bound.maxy = Math.max(bound.maxy, start[1]);
    for (let i = 1; i < op.path.length; i++) {
      const item = op.path[i];
      this.ctx.lineTo(item[0], item[1]);
      bound.minx = Math.min(bound.minx, item[0]);
      bound.miny = Math.min(bound.miny, item[1]);
      bound.maxx = Math.max(bound.maxx, item[0]);
      bound.maxy = Math.max(bound.maxy, item[1]);
    }
    this.ctx.closePath();
    const lineWidth = op.style.lineWidth || 0;
    this.setBoxMap(
      [bound.minx - lineWidth, bound.miny - lineWidth],
      [bound.maxx + lineWidth, bound.maxy + lineWidth],
      op
    );
  }
  drawPolygon(op: CanvasPolygon) {
    this.drawPolygonOrLine(op);
    const style = op.style;
    if (style.fillColor) {
      this.setShapeStyle(style);
      this.ctx.fill();
    }
    if (style.lineWidth && style.lineColor) {
      this.setLineStyle(style);
      this.ctx.stroke();
    }
  }
  drawLine(op: CanvasLine) {
    this.drawPolygonOrLine(op);
    const style = op.style;

    if (style.lineWidth && style.lineColor) {
      this.setLineStyle(style);
      this.ctx.stroke();
    }
  }

  drawText(op: CanvasText) {
    this.ctx.beginPath();
    const x = op.offsetX ? op.pos[0] + op.offsetX : op.pos[0];
    const y = op.offsetY ? op.pos[1] + op.offsetY : op.pos[1];
    const style = op.style;
    const fontSize = style.fontSize || 14;
    this.ctx.font = `${fontSize}px ${style.fontFamily || 'Sans-serif'}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const width = this.ctx.measureText(op.text).width;
    const lineWidth = style.lineWidth || 0;
    if (style.fillColor) {
      this.setShapeStyle(style);
      this.ctx.fillText(op.text, x, y);
    }
    if (style.lineColor && style.lineWidth) {
      this.setLineStyle(style);
      this.ctx.strokeText(op.text, x, y);
    }

    const w = Math.ceil(width * 0.5);
    const h = Math.ceil(fontSize * 0.5);
    this.setBoxMap([x - w - lineWidth, y - h - lineWidth], [x + w + lineWidth, y + h + lineWidth], op);
  }
  checkShapes(x: number, y: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    const objs: CanvasDrawType[] = [];
    //遍历可视范围内形状，判断是否在点击坐标上
    for (let i = 0; i < this.boxMap.length; i++) {
      const item = this.boxMap[i];
      if (x >= item.start[0] && y >= item.start[1] && x <= item.end[0] && y <= item.end[1]) {
        const type = item.data.type;
        //圆形 点到圆心距离在半径内
        if (type === 'Circle') {
          const d = Math.pow(x - item.data.center[0], 2) + Math.pow(y - item.data.center[1], 2);
          if (Math.sqrt(d) <= item.data.radius) {
            objs.push(item.data);
          }
          //多边形和折线，点通过射线算法是否在多边形内
        } else if (type === 'Polygon' || type === 'Line') {
          if (isPointInPolygon([x, y], item.data.path)) {
            objs.push(item.data);
          }
        } else {
          objs.push(item.data);
        }
      }
    }

    return objs;
  }
}
