import { Router, Request, Response, NextFunction } from 'express';
import { EMPRESA_IDS } from '../config/empresas.ts';

// Controllers
import { clientesController } from '../controllers/clientesController.ts';
import { dashboardController } from '../controllers/dashboardController.ts';
import { titulosController } from '../controllers/titulosController.ts';
import { settingsController } from '../controllers/settingsController.ts';
import { cobrancaController } from '../controllers/cobrancaController.ts';

const router = Router();

// Middleware: lê X-Empresa-Id e injeta em res.locals
router.use((req: Request, res: Response, next: NextFunction) => {
  const empresaId = (req.headers['x-empresa-id'] as string) || 'ics';
  res.locals.empresaId = EMPRESA_IDS.includes(empresaId) ? empresaId : 'ics';
  next();
});

// ──────────────── SYSTEM & SETTINGS ────────────────
router.get('/health', settingsController.getHealth);
router.get('/provedores/status', settingsController.getProvedoresStatus);
router.get('/config', settingsController.getConfig);
router.post('/config', settingsController.updateConfig);

// ──────────────── DASHBOARD & METRICS ────────────────
router.get('/dashboard', dashboardController.getDashboardStats);
router.get('/dashboard/projecao', dashboardController.getProjecao);
router.get('/contas-receber', dashboardController.getContasReceber);
router.get('/contas-receber/risco/:nivel', dashboardController.getContasReceberRisco);
router.get('/painel', dashboardController.getPainel);

// ──────────────── CLIENTES ────────────────
router.get('/clientes', clientesController.getClientes);
router.get('/clientes/:id', clientesController.getClienteById);
router.put('/clientes/:id', clientesController.updateCliente);

// ──────────────── TITULOS & ACORDOS ────────────────
router.get('/titulos', titulosController.getTitulos);
router.post('/titulos', titulosController.createTitulo);
router.get('/titulos/:id', titulosController.getTituloById);
router.put('/titulos/:id', titulosController.updateTitulo);
router.delete('/titulos/:id', titulosController.deleteTitulo);
router.get('/titulos/:id/historico', titulosController.getTituloHistorico);
router.post('/titulos/:id/cobrar', titulosController.cobrarManual);

router.get('/titulos/:id/acordos', titulosController.getAcordos);
router.post('/titulos/:id/acordos', titulosController.createAcordo);
router.put('/acordos/:id', titulosController.updateAcordo);
router.delete('/acordos/:id', titulosController.deleteAcordo);

// ──────────────── REGRAS & TEMPLATES ────────────────
router.get('/templates', settingsController.getTemplates);
router.post('/templates', settingsController.createTemplate);
router.put('/templates/:id', settingsController.updateTemplate);
router.delete('/templates/:id', settingsController.deleteTemplate);

router.get('/regras', settingsController.getRegras);
router.post('/regras', settingsController.createRegra);
router.put('/regras/:id', settingsController.updateRegra);
router.delete('/regras/:id', settingsController.deleteRegra);
router.post('/cobranca/executar', cobrancaController.executarRegras);

// ──────────────── USERS & AUTH ────────────────
router.get('/user', settingsController.getUser);
router.put('/user', settingsController.updateUser);
router.post('/user/change-password', settingsController.changePassword);
router.post('/login', settingsController.login);
router.post('/users', settingsController.createUser);

export default router;
