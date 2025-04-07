import fs from 'node:fs';
import { defineConfig } from 'vite';
const inputMap: { [n: string]: string } = {};
let html = '';
const files = fs.readdirSync('./src');
files.forEach((item) => {
  inputMap[item] = `src/${item}/index.ts`;
  html += `<li><a target='_blank' href='src/${item}/index.html'>${item}</a></li>`;
});
fs.writeFileSync(
  './index.html',
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo</title>
  </head>
  <body><ul>${html}</ul></body>
</html>
`
);

export default defineConfig(({ mode }) => {
  return {
    build: {
      minify: false,

      rollupOptions: {
        input: inputMap,
        output: {
          entryFileNames: '[name]/index.js'
        }
      }
    }
  };
});
