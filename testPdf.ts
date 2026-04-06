import { pdfService } from './backend/services/pdfService.ts';

async function run() {
  try {
    console.log("Starting PDF generation test...");
    const buffer = await pdfService.gerarRelatorioTitulos('ics');
    console.log("SUCCESS! PDF Buffer generated. Size:", buffer.length, "bytes");
    process.exit(0);
  } catch(e: any) {
    console.error("FAILURE! Error generating PDF:");
    console.error(e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}
run();
