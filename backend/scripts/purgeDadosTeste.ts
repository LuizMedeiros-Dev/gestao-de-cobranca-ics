/**
 * purgeDadosTeste.ts
 * 
 * Remove do banco PostgreSQL todos os clientes e títulos cujo empresa_id
 * não está entre as empresas configuradas no .env.
 * 
 * Execute com: npx tsx purgeDadosTeste.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Empresas válidas (lidas diretamente das variáveis de ambiente) ─────────────
const EMPRESA_IDS: string[] = [];

if (process.env.ICS_OMIE_APP_KEY && process.env.ICS_OMIE_APP_SECRET) EMPRESA_IDS.push('ics');
if (process.env.AUTHEN_OMIE_APP_KEY && process.env.AUTHEN_OMIE_APP_SECRET) EMPRESA_IDS.push('authen');
if (process.env.TARGET_OMIE_APP_KEY && process.env.TARGET_OMIE_APP_SECRET) EMPRESA_IDS.push('target');

async function run() {
  console.log('=== PURGE DE DADOS DE EMPRESAS INVÁLIDAS ===\n');
  console.log('Empresas válidas no .env:', EMPRESA_IDS);

  if (EMPRESA_IDS.length === 0) {
    console.error('\n❌ Nenhuma empresa configurada no .env! Abortando para não apagar tudo.');
    process.exit(1);
  }

  const placeholders = EMPRESA_IDS.map((_, i) => `$${i + 1}`).join(', ');

  // Descobre quais empresa_ids órfãos existem no banco
  const n = EMPRESA_IDS.length;
  const ph1 = EMPRESA_IDS.map((_, i) => `$${i + 1}`).join(', ');
  const ph2 = EMPRESA_IDS.map((_, i) => `$${n + i + 1}`).join(', ');

  const orphansResult = await pool.query(
    `SELECT DISTINCT empresa_id FROM titulos WHERE empresa_id NOT IN (${ph1})
     UNION
     SELECT DISTINCT empresa_id FROM clientes WHERE empresa_id NOT IN (${ph2})`,
    [...EMPRESA_IDS, ...EMPRESA_IDS]
  );
  const orphanIds: string[] = orphansResult.rows.map((r: any) => r.empresa_id);

  if (orphanIds.length === 0) {
    console.log('\n✅ Nenhum dado órfão encontrado. O banco já está limpo!');
    await pool.end();
    return;
  }

  console.log('\n⚠️  Empresas órfãs encontradas no banco:', orphanIds);
  console.log('\nIniciando limpeza...\n');

  // 1. Deleta cobrancas_enviadas vinculadas a títulos órfãos
  const delCobrancas = await pool.query(
    `DELETE FROM cobrancas_enviadas
     WHERE titulo_id IN (
       SELECT id FROM titulos WHERE empresa_id NOT IN (${placeholders})
     )`,
    EMPRESA_IDS
  );
  console.log(`  🗑️  cobrancas_enviadas removidas: ${delCobrancas.rowCount}`);

  // 2. Deleta acordos vinculados a títulos órfãos
  const delAcordos = await pool.query(
    `DELETE FROM acordos
     WHERE titulo_id IN (
       SELECT id FROM titulos WHERE empresa_id NOT IN (${placeholders})
     )`,
    EMPRESA_IDS
  );
  console.log(`  🗑️  acordos removidos: ${delAcordos.rowCount}`);

  // 3. Deleta títulos órfãos
  const delTitulos = await pool.query(
    `DELETE FROM titulos WHERE empresa_id NOT IN (${placeholders})`,
    EMPRESA_IDS
  );
  console.log(`  🗑️  títulos removidos: ${delTitulos.rowCount}`);

  // 4. Deleta clientes órfãos
  const delClientes = await pool.query(
    `DELETE FROM clientes WHERE empresa_id NOT IN (${placeholders})`,
    EMPRESA_IDS
  );
  console.log(`  🗑️  clientes removidos: ${delClientes.rowCount}`);

  const total = (delTitulos.rowCount ?? 0) + (delClientes.rowCount ?? 0);
  console.log(`\n✅ Limpeza concluída! Total de registros principais removidos: ${total}`);
  console.log('   Empresas removidas:', orphanIds.join(', '));

  await pool.end();
}

run().catch(err => {
  console.error('\n❌ Erro durante a limpeza:', err.message);
  pool.end();
  process.exit(1);
});
