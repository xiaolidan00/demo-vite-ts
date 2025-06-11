import './style.scss';

export type MoveActionType = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  left: number;
  top: number;
  target?: HTMLElement;
  enable: boolean;
  endLeft: number;
  endTop: number;
};
export type ResizeActionType = MoveActionType & {
  side: string;
  w: number;
  h: number;

  endW: number;
  endH: number;
};

export type RotateActionType = {
  target?: HTMLElement;
  enable: boolean;
  angle: number;
  parent?: HTMLElement;
  center: [number, number];
};

export type CardActionType = {
  container: HTMLElement;
  moveClass: string;
  resizeClass: string;
  rotateClass: string;
  moveCallback?: (p: { left: number; top: number; target: HTMLElement }) => void;
  resizeCallback?: (p: {
    left: number;
    top: number;
    width: number;
    height: number;
    target: HTMLElement;
  }) => void;
  rotateCallback?: (p: { angle: number; target: HTMLElement }) => void;
};

export function useCardAction(option: CardActionType) {
  const move: MoveActionType = {
    //当前鼠标位置
    startX: 0,
    startY: 0,
    //操作的相对移动位置
    x: 0,
    y: 0,
    //原始位置
    left: 0,
    top: 0,
    //最终位置
    endLeft: 0,
    endTop: 0,
    //是否可移动
    enable: false
  };

  const resize: ResizeActionType = {
    //当前鼠标位置
    startX: 0,
    startY: 0,
    //操作的相对移动位置
    x: 0,
    y: 0,
    //原始位置
    left: 0,
    top: 0,
    //原始宽高
    w: 0,
    h: 0,
    //最终位置
    endLeft: 0,
    endTop: 0,
    //最终宽高
    endW: 0,
    endH: 0,
    //当前操作的边
    side: '',
    //是否可调整大小
    enable: false
  };

  const rotate: RotateActionType = {
    //当前旋转角度
    angle: 0,
    //是否可旋转
    enable: false,
    //组件中心点位置
    center: [0, 0]
  };

  //初始化操作参数
  const startInit = (move: MoveActionType, ev: PointerEvent, target: HTMLElement) => {
    move.target = target;
    move.enable = true;
    move.startX = ev.clientX;
    move.startY = ev.clientY;
    move.x = 0;
    move.y = 0;
    move.left = target.offsetLeft;
    move.top = target.offsetTop;
    move.endLeft = target.offsetLeft;
    move.endTop = target.offsetTop;
  };
  const minEdge = 5;
  let offsetX = option.container.offsetLeft;
  let offsetY = option.container.offsetTop;
  const resizeCursor = (ev: PointerEvent, isDown?: boolean) => {
    const target = ev.target as HTMLElement;
    let c = '';

    //包含resizeClass类目的组件
    if (target.classList.contains(option.resizeClass)) {
      let xSide = '';
      let ySide = '';

      //判断鼠标位置是否在左右边附近
      if (Math.abs(ev.clientX - offsetX - target.offsetLeft) <= minEdge) {
        xSide = 'left';
      } else if (
        Math.abs(ev.clientX - offsetX - (target.offsetLeft + target.offsetWidth)) <= minEdge
      ) {
        xSide = 'right';
      }

      //判断鼠标位置是否在上下边附近
      if (Math.abs(ev.clientY - offsetY - target.offsetTop) <= minEdge) {
        ySide = 'top';
      } else if (
        Math.abs(ev.clientY - offsetY - (target.offsetTop + target.offsetHeight)) <= minEdge
      ) {
        ySide = 'bottom';
      }

      //设置鼠标resize样式
      if (xSide && ySide) {
        if ((xSide == 'left' && ySide == 'top') || (xSide == 'right' && ySide == 'bottom')) {
          c = 'nwse-resize';
        } else {
          c = 'nesw-resize';
        }
      } else if (ySide) {
        c = 'ns-resize';
      } else if (xSide) {
        c = 'ew-resize';
      }

      if (c) {
        document.body.style.cursor = c;
        target.style.cursor = c;
        if (isDown) {
          //鼠标按下,初始化操作参数
          console.log('resize');
          startInit(resize, ev, target);
          resize.side = xSide + ySide;
          resize.w = target.offsetWidth;
          resize.h = target.offsetHeight;
          resize.endW = target.offsetWidth;
          resize.endH = target.offsetHeight;
        }
      }
    }
    return c;
  };
  const radians2deg = (radians: number) => {
    return (radians * 180) / Math.PI;
  };
  const onStart = (ev: PointerEvent) => {
    const target = ev.target as HTMLElement;
    //包含rotateClass的组件
    if (target.classList.contains(option.rotateClass)) {
      console.log('rotate');
      target.style.cursor = 'grab';
      document.body.style.cursor = 'grab';

      rotate.target = target;
      rotate.parent = target.parentElement as HTMLElement;
      rotate.parent.style.cursor = 'grab';
      //中心点位置
      rotate.center = [
        rotate.parent.offsetLeft + rotate.parent.offsetWidth * 0.5,
        rotate.parent.offsetTop + rotate.parent.offsetHeight * 0.5
      ];
      //计算当前旋转角度
      const dx = rotate.center[0] - (ev.clientX - offsetX);
      const dy = rotate.center[1] - (ev.clientY - offsetY);
      //atan2算出的角度偏差90度，需要减去
      const a = radians2deg(Math.atan2(dy, dx)) - 90;

      rotate.angle = a;
      //开启旋转操作
      rotate.enable = true;
    } else {
      const c = resizeCursor(ev, true);
      //包含moveClass类目的组件
      if (!c && target.classList.contains(option.moveClass)) {
        console.log('move');

        document.body.style.cursor = 'move';
        target.style.cursor = 'move';

        startInit(move, ev, target);
      }
    }
  };
  const onMove = (ev: PointerEvent) => {
    if (rotate.enable && rotate.parent) {
      //计算当前角度
      const dx = rotate.center[0] - (ev.clientX - offsetX);
      const dy = rotate.center[1] - (ev.clientY - offsetY);
      const a = radians2deg(Math.atan2(dy, dx)) - 90;
      rotate.angle = a;

      rotate.parent.style.transform = `rotate(${a % 360}deg)`;
    } else if (resize.target && resize.enable) {
      //操作的相对移动位置
      resize.x += ev.clientX - resize.startX;
      resize.y += ev.clientY - resize.startY;

      //左边操作缘则移动位置和增减宽度，右边操作只需增减宽度
      if (resize.side.startsWith('left')) {
        resize.endLeft = ev.clientX - offsetX;
        resize.endW = resize.w - resize.x;
      } else if (resize.side.startsWith('right')) {
        resize.endW = resize.w + resize.x;
      }
      //上边操作缘则移动位置和增减高度，下边操作只需增减高度
      if (resize.side.endsWith('top')) {
        resize.endTop = ev.clientY - offsetY;
        resize.endH = resize.h - resize.y;
      } else if (resize.side.endsWith('bottom')) {
        resize.endH = resize.h + resize.y;
      }
      //更新组件位置和大小
      resize.target.style.left = resize.endLeft + 'px';
      resize.target.style.width = resize.endW + 'px';
      resize.target.style.top = resize.endTop + 'px';
      resize.target.style.height = resize.endH + 'px';
      //重置开始位置
      resize.startX = ev.clientX;
      resize.startY = ev.clientY;
    } else if (move.target && move.enable) {
      //操作的相对移动位置
      move.x += ev.clientX - move.startX;
      move.y += ev.clientY - move.startY;
      //重置开始位置
      move.startX = ev.clientX;
      move.startY = ev.clientY;
      //新的位置
      move.endLeft = move.left + move.x;
      move.endTop = move.top + move.y;
      //设置组件移动后的位置
      move.target.style.left = `${move.endLeft}px`;
      move.target.style.top = `${move.endTop}px`;
    } else {
      //悬浮在moveClass类目的组件上则改变鼠标样式
      const target = ev.target as HTMLElement;
      if (target.classList.contains(option.rotateClass)) {
        target.style.cursor = 'grab';
        const parent = target.parentElement as HTMLElement;
        parent.style.cursor = 'grab';
        document.body.style.cursor = 'grab';
      } else {
        const c = resizeCursor(ev);
        if (!c && target.classList.contains(option.moveClass)) {
          document.body.style.cursor = 'move';
          target.style.cursor = 'move';
        } else {
          document.body.style.cursor = 'default';
        }
      }
    }
  };

  const onEnd = () => {
    //鼠标样式回归默认
    document.body.style.cursor = 'default';
    if (rotate.enable && rotate.target && rotate.parent) {
      rotate.parent.style.cursor = 'default';
      rotate.target.style.cursor = 'default';
      //旋转后回调
      option.rotateCallback &&
        option.rotateCallback({ angle: rotate.angle, target: rotate.parent });
    }
    //关闭旋转操作
    rotate.enable = false;
    if (resize.enable && resize.target) {
      resize.target.style.cursor = 'default';
      //调整大小后回调
      option.resizeCallback &&
        option.resizeCallback({
          left: resize.endLeft,
          top: resize.endTop,
          target: resize.target,
          width: resize.endW,
          height: resize.endH
        });
    }
    //关闭调整大小操作
    resize.enable = false;
    if (move.enable && move.target) {
      move.target.style.cursor = 'default';
      //移动操作后回调
      option.moveCallback &&
        option.moveCallback({ left: move.endLeft, top: move.endTop, target: move.target });
    }
    //关闭移动操作
    move.enable = false;
  };

  const init = () => {
    offsetX = option.container.offsetLeft;
    offsetY = option.container.offsetTop;
    //注册鼠标监听
    option.container.addEventListener('pointerdown', onStart);
    option.container.addEventListener('pointermove', onMove);
    option.container.addEventListener('pointerup', onEnd);
  };

  const dispose = () => {
    //移除鼠标监听
    option.container.removeEventListener('pointerdown', onStart);
    option.container.removeEventListener('pointermove', onMove);
    option.container.removeEventListener('pointerup', onEnd);
  };

  return { init, dispose };
}

const cardAction = useCardAction({
  container: document.getElementById('cardContainer')!,
  rotateClass: 'rotation',
  moveClass: 'card-elmt',
  resizeClass: 'card-elmt'
});
cardAction.init();
