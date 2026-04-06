import fs from 'fs';
import { query } from './backend/config/database.ts';

async function check() {
  const r = await query(`
    SELECT t.*, c.nome_fantasia, c.razao_social 
    FROM titulos t 
    JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie 
    WHERE c.nome_fantasia ILIKE '%Luiz%' OR c.razao_social ILIKE '%Luiz%'
  `);
  fs.writeFileSync('luiz_titles.txt', JSON.stringify(r.rows, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
