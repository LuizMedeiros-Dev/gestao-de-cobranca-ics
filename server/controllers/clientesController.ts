import { Request, Response } from 'express';
import { query } from '../config/database.ts';

/**
 * Controller responsavel por gerenciar as rotas relacionadas aos clientes
 */
export const clientesController = {
  /**
   * Buscar todos os clientes da empresa atual com métricas
   */
  async getClientes(req: Request, res: Response) {
    const empresaId = res.locals.empresaId;
    const { search } = req.query;
    try {
      let sql = `
        SELECT c.*,
          COUNT(t.id) as total_titulos,
          COALESCE(SUM(CASE WHEN UPPER(t.status_titulo) != 'PAGO' THEN t.valor_documento ELSE 0 END), 0) as total_em_aberto,
          COALESCE(SUM(CASE WHEN UPPER(t.status_titulo) = 'PAGO' THEN t.valor_documento ELSE 0 END), 0) as total_pago,
          MAX(ce.data_envio) as ultimo_disparo
        FROM clientes c
        LEFT JOIN titulos t ON c.codigo_omie = t.codigo_cliente_omie AND t.empresa_id = c.empresa_id
        LEFT JOIN cobrancas_enviadas ce ON ce.titulo_id = t.id
        WHERE c.empresa_id = $1
      `;
      const params: any[] = [empresaId];
      if (search) {
        sql += ` AND (c.nome_fantasia ILIKE $2 OR c.razao_social ILIKE $2 OR c.cnpj_cpf ILIKE $2)`;
        params.push(`%${search}%`);
      }
      sql += ` GROUP BY c.id ORDER BY total_em_aberto DESC`;
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Buscar cliente especifico por ID trazendo os titulos vinculados
   */
  async getClienteById(req: Request, res: Response) {
    const { id } = req.params;
    const empresaId = res.locals.empresaId;
    try {
      const clienteResult = await query('SELECT * FROM clientes WHERE id = $1 AND empresa_id = $2', [id, empresaId]);
      if (clienteResult.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
      const cliente = clienteResult.rows[0];

      const titulosResult = await query(`
        SELECT t.*,
          CASE
            WHEN UPPER(t.status_titulo) = 'PAGO' THEN 'PAGO'
            WHEN t.data_vencimento < CURRENT_DATE THEN 'ATRASADO'
            WHEN t.data_vencimento = CURRENT_DATE THEN 'VENCE HOJE'
            ELSE 'A VENCER'
          END as status_calculado
        FROM titulos t
        WHERE t.empresa_id = $1 AND t.codigo_cliente_omie = $2
        ORDER BY t.data_vencimento DESC
      `, [empresaId, cliente.codigo_omie]);

      const disparosResult = await query(`
        SELECT ce.* FROM cobrancas_enviadas ce
        JOIN titulos t ON ce.titulo_id = t.id
        WHERE t.empresa_id = $1 AND t.codigo_cliente_omie = $2
        ORDER BY ce.data_envio DESC LIMIT 50
      `, [empresaId, cliente.codigo_omie]);

      res.json({ ...cliente, titulos: titulosResult.rows, disparos: disparosResult.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atualizar dados manuais de um cliente
   */
  async updateCliente(req: Request, res: Response) {
    const { id } = req.params;
    const { email, telefone } = req.body;
    try {
      await query('UPDATE clientes SET email = $1, telefone = $2 WHERE id = $3', [email, telefone, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
