import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const pdfmakejs = req('pdfmake/js/index');
console.log("pdfmake/js/index type:", typeof pdfmakejs);
console.log("pdfmake/js/index keys:", Object.keys(pdfmakejs));
if (pdfmakejs && pdfmakejs.default) console.log("default type:", typeof pdfmakejs.default);
