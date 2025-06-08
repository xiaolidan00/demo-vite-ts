import { MapHtmlOptions, type MapHtmlOverlay, MyMap } from './map';
import { type CanvasDrawType } from './CanvasRender';
import { type LngLatXY } from './SphericalMercator';
const map = new MyMap({
  container: document.getElementById('map') as HTMLElement,
  zoom: 18,
  center: [116.407387, 39.904179]
});

const shapes: CanvasDrawType[] = [
  {
    id: 'Image',
    type: 'Image',
    pos: [116.407387, 39.903],
    url: 'location.png',
    isAction: true
  },
  {
    id: 'Circle',
    type: 'Circle',
    center: [116.407387, 39.904179],
    radius: 50,
    style: {
      fillColor: 'red',
      fillOpacity: 0.5,
      lineColor: 'red',
      lineWidth: 3
    },
    isAction: true
  },
  {
    id: 'Rect',
    type: 'Rect',
    start: [116.408, 39.904179],
    end: [116.409, 39.9045],
    style: {
      fillColor: 'yellow',
      fillOpacity: 0.5,
      lineColor: 'orange',
      lineWidth: 3
    },
    isAction: true
  },
  {
    id: 'Text',
    type: 'Text',
    pos: [116.406, 39.904179],
    text: 'Hello World',
    style: {
      fontSize: 30,
      fillColor: 'green'
    },
    isAction: true
  },
  {
    id: 'Line',
    type: 'Line',
    isClose: true,
    path: [
      [116.407, 39.904179],
      [116.4085, 39.904179],
      [116.4085, 39.905]
    ],
    style: {
      lineColor: 'blue',
      lineWidth: 3
    },
    isAction: true
  },
  {
    id: 'Polygon',
    type: 'Polygon',
    path: [
      [116.407, 39.905],
      [116.4085, 39.905],
      [116.4085, 39.906]
    ],
    style: {
      fillColor: 'blue',
      fillOpacity: 0.5,
      lineColor: 'blue',
      lineWidth: 3
    },
    isAction: true
  }
];
shapes.forEach((item) => {
  map.add(item);
});

function getTextBox(str: string) {
  return `<div class="text-box"><div>${str}</div></div>`;
}
const textBox: MapHtmlOverlay = {
  type: 'html',
  content: getTextBox('Hello Map'),
  pos: [116.4085, 39.9035],
  id: 'textbox'
};
map.addHtml(textBox);

const htmlObj: MapHtmlOverlay = {
  type: 'html',
  content: getTextBox('HTML Box'),
  pos: [116.406, 39.9035],
  id: 'html',
  isAction: true
};
map.addHtml(htmlObj);

let selectObj: CanvasDrawType;
map.events.on(
  'click',
  ({ objs, lnglat, htmls }: { objs: CanvasDrawType[]; lnglat: LngLatXY; htmls: MapHtmlOptions[] }) => {
    if (htmls.length)
      console.log(
        '🚀 ~ htmls:',
        htmls.map((item) => item.data.id)
      );
    // console.log(
    //   '🚀 ~ map.events.on ~ objs:',
    //   objs.map((item) => item.id),
    //   htmls
    // );

    if (objs.length) {
      textBox.content = getTextBox(objs[0].id + '');
      textBox.pos = lnglat;

      if (selectObj) {
        //@ts-ignore
        if (['Rect', 'Circle', 'Polygon'].includes(selectObj.type)) {
          //@ts-ignore
          selectObj.style.fillOpacity = 0.5;
        }
      }
      selectObj = objs[0];

      //@ts-ignore
      if (['Rect', 'Circle', 'Polygon'].includes(selectObj.type)) {
        //@ts-ignore
        selectObj.style.fillOpacity = 1;
      }
      map.drawLayer();
    }
  }
);
