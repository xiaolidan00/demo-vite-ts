import GUI from 'lil-gui';

export type GuiType =
  | ({ name: string; onChange?: (value: any) => void } & (
      | { type: 'number'; min: number; max: number; step: number }
      | {
          type: 'select';
          options: { [n: string | number]: number | string | boolean } | string[] | number[];
        }
      | { type: 'color' }
    ))
  | { type: 'title'; title: string };
export function createGui(config: GuiType[], dataObj: { [n: string]: boolean | string | number }) {
  const gui = new GUI();
  config.forEach((item) => {
    let ctrl;
    if (item.type === 'color') {
      ctrl = gui.addColor(dataObj, item.name);
    } else if (item.type === 'number') {
      ctrl = gui.add(dataObj, item.name, item.min, item.max, item.step);
    } else if (item.type === 'select') {
      ctrl = gui.add(dataObj, item.name, item.options);
    } else if (item.type === 'title') {
      gui.title(item.title);
    }
    if (ctrl && item.onChange) ctrl.onChange(item.onChange);
  });
  return gui;
}
