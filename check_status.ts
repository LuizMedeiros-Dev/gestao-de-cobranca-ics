import { query } from './backend/config/database.ts';

async function check() {
  const result = await query(`
    SELECT status_titulo, COUNT(*) as qtd
    FROM titulos
    GROUP BY status_titulo
  `);
  console.log('Contagem de Status:');
  console.table(result.rows);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
