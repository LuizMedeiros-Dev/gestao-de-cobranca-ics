import { query } from './backend/config/database.ts';
import dotenv from 'dotenv';
dotenv.config();

async function fixTemplates() {
  // Mostra o estado atual
  const before = await query('SELECT id, nome, tipo FROM templates');
  console.log('=== ANTES ===');
  for (const t of before.rows) {
    console.log(`  ID ${t.id}: "${t.nome}" — tipo: ${t.tipo}`);
  }

  // Atualiza todos os templates com tipo=null para 'email' (padrão)
  const updated = await query(`
    UPDATE templates SET tipo = 'email' WHERE tipo IS NULL OR tipo = ''
    RETURNING id, nome, tipo
  `);

  console.log('\n=== CORRIGIDOS ===');
  for (const t of updated.rows) {
    console.log(`  ID ${t.id}: "${t.nome}" — tipo definido para: ${t.tipo}`);
  }

  process.exit(0);
}

fixTemplates().catch(err => { console.error(err.message); process.exit(1); });
