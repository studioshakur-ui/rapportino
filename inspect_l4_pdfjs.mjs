import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

function groupByRow(items, yTolerance = 4) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  let currentRow = [];
  let lastY = null;
  for (const item of sorted) {
    if (lastY === null || Math.abs(item.y - lastY) <= yTolerance) {
      currentRow.push(item);
      lastY = item.y;
    } else {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [item];
      lastY = item.y;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

const data = new Uint8Array(fs.readFileSync('C:/Users/hamid/Downloads/L4.pdf'));
const pdf = await pdfjs.getDocument({ data }).promise;
const items = [];
for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  for (const raw of content.items) {
    if (!raw.str || !raw.str.trim()) continue;
    items.push({ str: raw.str.trim(), x: Math.round(raw.transform[4]), y: Math.round(raw.transform[5]), page: pageNum });
  }
}
const rows = groupByRow(items);
console.log('items', items.length, 'rows', rows.length);
for (const row of rows.slice(0, 55)) {
  console.log(row.map(i => `[${i.x}:${i.str}]`).join(' '));
}
