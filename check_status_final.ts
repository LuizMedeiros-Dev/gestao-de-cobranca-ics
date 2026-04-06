import fs from 'fs';
import { query } from './backend/config/database.ts';

async function check() {
  const r = await query("SELECT status_titulo, COUNT(*) as qtd FROM titulos GROUP BY status_titulo");
  const out = r.rows.map((row: any) => `${row.status_titulo}: ${row.qtd}`).join('\n');
  fs.writeFileSync('status_counts.txt', out);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
