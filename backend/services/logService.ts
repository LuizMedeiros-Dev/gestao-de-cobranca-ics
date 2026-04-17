import { query } from '../config/database.ts';

export const logService = {
  async registrar(usuario_id: number | null, tipo: string, mensagem: string, detalhes: string = '') {
    try {
      await query(
        'INSERT INTO logs (usuario_id, tipo, mensagem, detalhes) VALUES ($1, $2, $3, $4)',
        [usuario_id, tipo, mensagem, detalhes]
      );
    } catch (error) {
      console.error('[logService] Erro ao registrar log:', error);
    }
  }
};
