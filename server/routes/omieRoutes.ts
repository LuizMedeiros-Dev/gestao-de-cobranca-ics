import { Router } from 'express';
import { omieSyncService } from '../services/omieSyncService.ts';
import { cobrancaService } from '../services/cobrancaService.ts';
import { EMPRESA_IDS } from '../config/empresas.ts';

const router = Router();

// Sincroniza uma empresa específica: POST /api/omie/sync/ics | /authen | /target
router.post('/sync/:empresaId', async (req, res) => {
  const { empresaId } = req.params;
  if (!EMPRESA_IDS.includes(empresaId)) {
    return res.status(400).json({ success: false, error: `Empresa '${empresaId}' não encontrada. Opções: ${EMPRESA_IDS.join(', ')}` });
  }
  try {
    await omieSyncService.fullSync(empresaId);
    res.json({ success: true, message: `Sincronização da empresa '${empresaId}' concluída.` });
  } catch (error: any) {
    console.error(`Erro na sincronização de '${empresaId}':`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mantém atalho sem parâmetro → sincroniza ICS (compatibilidade com botão do Painel)
router.post('/sync', async (req, res) => {
  // Lê empresa do header caso o front-end já o envie
  const empresaId = (req.headers['x-empresa-id'] as string) || 'ics';
  const validId = EMPRESA_IDS.includes(empresaId) ? empresaId : 'ics';
  try {
    await omieSyncService.fullSync(validId);
    res.json({ success: true, message: `Sincronização da empresa '${validId}' concluída.` });
  } catch (error: any) {
    console.error('Erro na sincronização manual:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/vencidos', async (req, res) => {
  try {
    const vencidos = await cobrancaService.getTitulosVencidos();
    res.json(vencidos);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove clientes e títulos de empresas que não estão mais no .env
router.post('/purge-invalidas', async (req, res) => {
  try {
    const resultado = await omieSyncService.purgeEmpresasInvalidas();
    res.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Erro no purge de empresas inválidas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
