import { Request, Response } from 'express';
import { cobrancaService } from '../services/cobrancaService.ts';

/**
 * Controller responsavel por disparos assincronos e rotinas de Cobrança
 */
export const cobrancaController = {
  /**
   * Executa manualmente as regras de cobrança cadastradas para a empresa logada
   */
  async executarRegras(req: Request, res: Response) {
    const empresaId = res.locals.empresaId;
    try {
      const resultado = await cobrancaService.executarRegrasCobranca(empresaId);
      res.json({ success: true, ...resultado });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
