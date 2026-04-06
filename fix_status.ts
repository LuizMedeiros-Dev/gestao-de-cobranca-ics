import { query } from './backend/config/database.ts';

async function fix() {
  console.log('Iniciando correção de status...');
  const result = await query(`
    UPDATE titulos 
    SET status_titulo = 'PAGO' 
    WHERE UPPER(status_titulo) IN ('LIQUIDADO', 'RECEBIDO')
  `);
  console.log(`Sucesso! ${result.rowCount} títulos atualizados.`);
  process.exit(0);
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
