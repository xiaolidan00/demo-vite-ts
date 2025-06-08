import fs from 'node:fs';
import { defineConfig } from 'vite';

function readSrc() {
  const inputMap: { [n: string]: string } = {};
  const files = fs.readdirSync('./src');
  files.forEach((item) => {
    inputMap[item] = `src/${item}/index.ts`;
  });
  return inputMap;
}
const pages = readSrc();
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
