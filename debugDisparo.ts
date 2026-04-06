import { query } from './backend/config/database.ts';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  // Verifica o cliente que tem o título com numero_documento próximo a 4500
  const res = await query(`
    SELECT 
      t.id as titulo_id,
      t.numero_documento,
      t.data_vencimento,
      t.status_titulo,
      t.empresa_id,
      c.razao_social,
      c.nome_fantasia,
      c.email as email_db,
      ce.status as status_envio,
      ce.tipo_envio,
      ce.detalhes
    FROM cobrancas_enviadas ce
    JOIN titulos t ON ce.titulo_id = t.id
    LEFT JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie AND t.empresa_id = c.empresa_id
    WHERE ce.tipo_envio LIKE 'regra_6_%'
    ORDER BY ce.id DESC
    LIMIT 10
  `);

  console.log('=== ÚLTIMOS DISPAROS COM REGRA 6 ===');
  for (const row of res.rows) {
    console.log(`Título: ${row.numero_documento} | Cliente: ${row.razao_social || row.nome_fantasia} | E-mail no BD: "${row.email_db}" | Status envio: ${row.status_envio}`);
  }

  // Verifica clientes sem email
  const semEmail = await query(`
    SELECT COUNT(*) as total, COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as sem_email
    FROM clientes
  `);
  console.log('\n=== CLIENTES NO BANCO ===');
  console.log(`Total de clientes: ${semEmail.rows[0].total}`);
  console.log(`Clientes SEM e-mail: ${semEmail.rows[0].sem_email}`);
}

debug().then(() => process.exit(0)).catch(console.error);
