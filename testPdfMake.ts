import PdfPrinter from 'pdfmake';
import * as pdfmake from 'pdfmake';
import fs from 'fs';

let out = "Default export type: " + typeof PdfPrinter + "\n";
if (typeof PdfPrinter === 'object') {
  out += "Default keys: " + Object.keys(PdfPrinter).join(', ') + "\n";
  if (PdfPrinter && PdfPrinter.default) {
    out += "PdfPrinter.default type: " + typeof PdfPrinter.default + "\n";
  }
}

out += "Wildcard keys: " + Object.keys(pdfmake).join(', ') + "\n";

fs.writeFileSync('testPdfMake.txt', out);
