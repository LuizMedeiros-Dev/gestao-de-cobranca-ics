import { Request, Response } from 'express';
import { query } from '../config/database.ts';
import { cobrancaService, formatarData, formatarMoeda } from '../services/cobrancaService.ts';

/**
 * Controller responsavel por listar e manipular titulos financeiros e seus respectivos acordos
 */
export const titulosController = {
  /**
   * Buscar todos os títulos filtrados
   */
  async getTitulos(req: Request, res: Response) {
    const { status, search } = req.query;
    const empresaId = res.locals.empresaId;
    if (!empresaId) {
      console.error('EmpresaId não encontrado no res.locals');
      return res.status(400).json({ error: 'Identificação da empresa ausente' });
    }

    let sql = `
      SELECT t.*, c.nome_fantasia as cliente,
             t.valor_documento as valor_documento, t.status_titulo as status_titulo,
             CASE
               WHEN UPPER(t.status_titulo) = 'PAGO' THEN 'PAGO'
               WHEN t.data_vencimento < CURRENT_DATE THEN 'ATRASADO'
               WHEN t.data_vencimento = CURRENT_DATE THEN 'VENCE HOJE'
               ELSE 'A VENCER'
             END as status_calculado
      FROM titulos t
      LEFT JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie AND c.empresa_id = t.empresa_id
      WHERE t.empresa_id = $1
    `;
    const params: any[] = [empresaId];

    if (status && status !== 'all') {
      const statusList = (Array.isArray(status) ? status : (status as string).split(',')).map(s => String(s).trim()).filter(Boolean);
      if (statusList.length > 0) {
        const conditions = [];
        for (const s of statusList) {
          if (s === 'A VENCER') conditions.push(`(UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento > CURRENT_DATE)`);
          else if (s === 'VENCE HOJE') conditions.push(`(UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento = CURRENT_DATE)`);
          else if (s === 'ATRASADO') conditions.push(`(UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento < CURRENT_DATE)`);
          else if (s === 'PAGO') conditions.push(`UPPER(t.status_titulo) = 'PAGO'`);
          else {
            conditions.push(`UPPER(t.status_titulo) = UPPER($${params.length + 1})`);
            params.push(s);
          }
        }
        sql += ` AND (${conditions.join(' OR ')})`;
      }
    }

    if (search) {
      sql += ` AND (t.numero_documento ILIKE $${params.length + 1} OR c.nome_fantasia ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY t.data_vencimento DESC`;

    try {
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Criar título manualmente
   */
  async createTitulo(req: Request, res: Response) {
    const { numero_documento, valor_documento, data_vencimento, data_emissao, status_titulo } = req.body;
    try {
      const valor = typeof valor_documento === 'string'
        ? parseFloat(valor_documento.replace(/[^\d,.-]/g, '').replace(',', '.'))
        : valor_documento;

      if (isNaN(valor) && valor !== null) {
        return res.status(400).json({ error: 'Valor do título inválido' });
      }

      const result = await query(`
        INSERT INTO titulos (numero_documento, valor_documento, data_vencimento, data_emissao, status_titulo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [numero_documento, valor, data_vencimento, data_emissao, status_titulo]);

      res.json({ id: result.rows[0].id, success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter título especifico por ID trazendo historico
   */
  async getTituloById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await query(`
        SELECT t.*, c.nome_fantasia as cliente,
               t.valor_documento as valor_documento, t.status_titulo as status_titulo,
               CASE
                 WHEN UPPER(t.status_titulo) = 'PAGO' THEN 'PAGO'
                 WHEN t.data_vencimento < CURRENT_DATE THEN 'ATRASADO'
                 WHEN t.data_vencimento = CURRENT_DATE THEN 'VENCE HOJE'
                 ELSE 'A VENCER'
               END as status_calculado
        FROM titulos t
        LEFT JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie
        WHERE t.id = $1
      `, [id]);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Título não encontrado' });

      const titulo = result.rows[0];
      const historicoResult = await query('SELECT * FROM cobrancas_enviadas WHERE titulo_id = $1 ORDER BY data_envio DESC', [id]);
      titulo.historico = historicoResult.rows;

      res.json(titulo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atualizar dados de um título manualmente
   */
  async updateTitulo(req: Request, res: Response) {
    const { id } = req.params;
    const { numero_documento, valor_documento, data_vencimento, data_emissao, status_titulo } = req.body;
    try {
      const valor = typeof valor_documento === 'string'
        ? parseFloat(valor_documento.replace(/[^\d,.-]/g, '').replace(',', '.'))
        : valor_documento;

      await query(`
        UPDATE titulos 
        SET numero_documento = $1, valor_documento = $2, data_vencimento = $3, data_emissao = $4, status_titulo = $5
        WHERE id = $6
      `, [numero_documento, valor, data_vencimento, data_emissao, status_titulo, id]);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar titulo manualmente
   */
  async deleteTitulo(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await query('DELETE FROM titulos WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Trazer historico de cobrancas enviadas para este titulo
   */
  async getTituloHistorico(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await query('SELECT * FROM cobrancas_enviadas WHERE titulo_id = $1 ORDER BY data_envio DESC', [id]);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Executa a rota de envio manual de uma cobranca de titulo (Email/WhatsApp)
   */
  async cobrarManual(req: Request, res: Response) {
    const { id } = req.params;
    const { canal, mensagem } = req.body;
    try {
      if (!['email', 'whatsapp'].includes(canal)) {
        return res.status(400).json({ error: 'Canal deve ser email ou whatsapp' });
      }
      const resultado = await cobrancaService.cobrarTituloManual(parseInt(id), canal, mensagem);
      res.json(resultado);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ──────────────── ACORDOS ────────────────
  async getAcordos(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await query('SELECT * FROM acordos WHERE titulo_id = $1 ORDER BY data_acordo DESC', [id]);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async createAcordo(req: Request, res: Response) {
    const { id } = req.params;
    const { 
      descricao, valor_total, numero_parcelas, valor_parcela, 
      data_primeira_parcela, observacoes, mensagem_email, mensagem_whatsapp 
    } = req.body;
    
    try {
      const result = await query(`
        INSERT INTO acordos (titulo_id, descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela, observacoes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [id, descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela ? data_primeira_parcela : null, observacoes]);
      
      await query('UPDATE metricas SET acordos_fechados = acordos_fechados + 1 WHERE data = CURRENT_DATE');

      // Tenta enviar as mensagens se houver conteúdo
      const overrides = {
        vencimento: data_primeira_parcela ? formatarData(data_primeira_parcela) : '',
        valor: valor_parcela ? formatarMoeda(Number(valor_parcela)) : ''
      };

      if (mensagem_email) {
        await cobrancaService.cobrarTituloManual(parseInt(id), 'email', mensagem_email, overrides).catch(err => {
          console.error('Erro ao enviar e-mail do acordo:', err.message);
        });
      }

      if (mensagem_whatsapp) {
        await cobrancaService.cobrarTituloManual(parseInt(id), 'whatsapp', mensagem_whatsapp, overrides).catch(err => {
          console.error('Erro ao enviar WhatsApp do acordo:', err.message);
        });
      }

      res.json({ id: result.rows[0].id, success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateAcordo(req: Request, res: Response) {
    const { id } = req.params;
    const { 
      descricao, valor_total, numero_parcelas, valor_parcela, 
      data_primeira_parcela, observacoes, status, 
      mensagem_email, mensagem_whatsapp, titulo_id
    } = req.body;
    
    try {
      await query(`
        UPDATE acordos 
        SET descricao = $1, valor_total = $2, numero_parcelas = $3, valor_parcela = $4, data_primeira_parcela = $5, observacoes = $6, status = $7
        WHERE id = $8
      `, [descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela ? data_primeira_parcela : null, observacoes, status || 'Ativo', id]);

      // No update, também permitimos o disparo se mensagens forem fornecidas
      const targetTituloId = titulo_id; // Precisamos do ID do título para cobrar
      const overrides = {
        vencimento: data_primeira_parcela ? formatarData(data_primeira_parcela) : '',
        valor: valor_parcela ? formatarMoeda(Number(valor_parcela)) : ''
      };
      
      if (targetTituloId) {
        if (mensagem_email) {
          await cobrancaService.cobrarTituloManual(targetTituloId, 'email', mensagem_email, overrides).catch(err => {
            console.error('Erro ao enviar e-mail do acordo (update):', err.message);
          });
        }

        if (mensagem_whatsapp) {
          await cobrancaService.cobrarTituloManual(targetTituloId, 'whatsapp', mensagem_whatsapp, overrides).catch(err => {
            console.error('Erro ao enviar WhatsApp do acordo (update):', err.message);
          });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async deleteAcordo(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await query('DELETE FROM acordos WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
