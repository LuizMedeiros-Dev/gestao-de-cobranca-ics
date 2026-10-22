import cron from 'node-cron';
import { omieSyncService } from '../services/omieSyncService.ts';
import { cobrancaService } from '../services/cobrancaService.ts';
import { EMPRESA_IDS } from '../config/empresas.ts';

export const initSyncJob = async () => {
  // Garantir que as tabelas existam (incluindo colunas empresa_id)
  await omieSyncService.createTables();

  // Sincronização OMIE a cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Job] Iniciando sincronização automática com OMIE...');
    try {
      // Sincroniza todas as empresas que têm chaves configuradas
      for (const empresaId of EMPRESA_IDS) {
        try {
          await omieSyncService.fullSync(empresaId);
          console.log(`[Job] Sincronização da empresa '${empresaId}' concluída.`);
        } catch (err: any) {
          // Ignora empresas sem chaves configuradas
          if (err.message?.includes('não configuradas')) {
            console.log(`[Job] Empresa '${empresaId}' sem chaves OMIE — pulando.`);
          } else {
            console.error(`[Job] Erro ao sincronizar '${empresaId}':`, err.message);
          }
        }
      }
      console.log('[Job] Sincronização automática concluída com sucesso.');
    } catch (error) {
      console.error('[Job] Erro na sincronização automática:', error);
    }
  });

  // Motor de regras de cobrança — todo dia às 8h
  cron.schedule('0 8 * * *', async () => {
    console.log('[Job] Executando motor de regras de cobrança...');
    for (const empresaId of EMPRESA_IDS) {
      try {
        const resultado = await cobrancaService.executarRegrasCobranca(empresaId);
        console.log(`[Job] Regras empresa '${empresaId}': ${resultado.disparos} disparos.`);
      } catch (err: any) {
        console.error(`[Job] Erro nas regras de '${empresaId}':`, err.message);
      }
    }
  });
};
