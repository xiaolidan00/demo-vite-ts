import fs from 'node:fs';
import { defineConfig } from 'vite';

function readSrc(rootPath: string) {
  const inputMap: { [n: string]: string } = {};
  const files = fs.readdirSync(rootPath);
  files.forEach((item) => {
    if (!['utils', 'assets', '@types', 'data'].includes(item)) inputMap[item] = `${rootPath}/${item}/index.ts`;
  });
  return inputMap;
}
const pages = readSrc('./src');
fs.writeFileSync('./urls.ts', 'export default ' + JSON.stringify(pages));

export default defineConfig(({ mode }) => {
  return {
    build: {
      minify: false,

      rollupOptions: {
        input: pages,
        output: {
          entryFileNames: '[name]/index.js'
        }
      }
    }
  };
});
