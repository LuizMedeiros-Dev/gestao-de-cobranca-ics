import { Request, Response } from 'express';
import { query } from '../config/database.ts';

/**
 * Controller responsavel pelas estatísticas do Financeiro e Dashboard Front-page
 */
export const dashboardController = {
  /**
   * Buscar estatisticas principais do Dashboard
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const params: any[] = [];
      let dateFilter = '';

      if (startDate && endDate) {
        dateFilter = 'WHERE data_vencimento >= $1 AND data_vencimento <= $2';
        params.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'WHERE data_vencimento >= $1';
        params.push(startDate);
      } else if (endDate) {
        dateFilter = 'WHERE data_vencimento <= $1';
        params.push(endDate);
      }

      const empresaId = res.locals.empresaId;
      const empresaParam = params.length + 1;
      const empresaFilter = dateFilter
        ? `${dateFilter} AND empresa_id = $${empresaParam}`
        : `WHERE empresa_id = $${empresaParam}`;
      params.push(empresaId);

      const statsResult = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN UPPER(status_titulo) != 'PAGO' THEN valor_documento ELSE 0 END), 0) as total_receber,
          COALESCE(SUM(CASE WHEN UPPER(status_titulo) = 'PAGO' THEN valor_documento ELSE 0 END), 0) as total_pago,
          COALESCE(SUM(CASE WHEN UPPER(status_titulo) != 'PAGO' AND data_vencimento < CURRENT_DATE THEN valor_documento ELSE 0 END), 0) as total_vencido,
          COALESCE(SUM(CASE WHEN UPPER(status_titulo) != 'PAGO' AND data_vencimento < CURRENT_DATE - INTERVAL '5 days' THEN valor_documento ELSE 0 END), 0) as total_atrasado
        FROM titulos
        ${empresaFilter}
      `, params);

      const evolutionResult = await query(`
        SELECT TO_CHAR(data_vencimento, 'DD/MM') as data, SUM(valor_documento) as valor
        FROM titulos
        ${empresaFilter}
        GROUP BY data_vencimento
        ORDER BY data_vencimento ASC
        LIMIT 7
      `, params);

      const distributionResult = await query(`
        SELECT 
          status_titulo as name,
          SUM(valor_documento) as value
        FROM titulos
        ${empresaFilter}
        GROUP BY status_titulo
      `, params);

      res.json({
        stats: statsResult.rows[0],
        evolution: evolutionResult.rows,
        distribution: distributionResult.rows
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Projecao do Fluxo de Caixa (proximos 30/60/90 dias)
   */
  async getProjecao(req: Request, res: Response) {
    const empresaId = res.locals.empresaId;
    try {
      const result = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN valor_documento ELSE 0 END), 0) as proximos_30,
          COALESCE(SUM(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN valor_documento ELSE 0 END), 0) as proximos_60,
          COALESCE(SUM(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN valor_documento ELSE 0 END), 0) as proximos_90,
          COUNT(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as qtd_30,
          COUNT(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as qtd_60,
          COUNT(CASE WHEN data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as qtd_90
        FROM titulos
        WHERE empresa_id = $1
          AND UPPER(status_titulo) NOT IN ('PAGO', 'CANCELADO')
          AND data_vencimento >= CURRENT_DATE
      `, [empresaId]);
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Resumo de Contas a Receber (Listagem detalhada)
   */
  async getContasReceber(req: Request, res: Response) {
    const { startDate, endDate } = req.query;
    const empresaId = res.locals.empresaId;

    try {
      let sql = 'SELECT *, valor_documento as valor, status_titulo as status FROM titulos WHERE empresa_id = $1';
      const params: any[] = [empresaId];

      if (startDate) {
        sql += ` AND data_vencimento >= $${params.length + 1}`;
        params.push(startDate);
      }

      if (endDate) {
        sql += ` AND data_vencimento <= $${params.length + 1}`;
        params.push(endDate);
      }

      const result = await query(sql, params);
      const titulos = result.rows;

      const totalAReceber = titulos
        .filter(t => t.status?.toUpperCase() !== 'PAGO')
        .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

      const getIsoDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };

      const h_today = getIsoDate(new Date());
      const vencidos = titulos.filter(t => {
        const dv = getIsoDate(t.data_vencimento);
        return t.status?.toUpperCase() !== 'PAGO' && dv < h_today && dv !== '';
      });
      const aVencer = titulos.filter(t => {
        const dv = getIsoDate(t.data_vencimento);
        return t.status?.toUpperCase() !== 'PAGO' && dv >= h_today && dv !== '';
      });
      const recebidosApos = titulos.filter(t => {
        if (t.status?.toUpperCase() !== 'PAGO' || !t.data_pagamento) return false;
        const dp = getIsoDate(t.data_pagamento);
        const dv = getIsoDate(t.data_vencimento);
        return dp !== '' && dv !== '' && dp > dv;
      });
      const recebidosAte = titulos.filter(t => {
        if (t.status?.toUpperCase() !== 'PAGO' || !t.data_pagamento) return false;
        const dp = getIsoDate(t.data_pagamento);
        const dv = getIsoDate(t.data_vencimento);
        return dp !== '' && dv !== '' && dp <= dv;
      });

      const resumoContas = [
        { categoria: 'Títulos Totais', quantidade: titulos.length, valor: titulos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0), percentual: 100, color: '#3b82f6' },
        { categoria: 'Vencidos', quantidade: vencidos.length, valor: vencidos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0), percentual: titulos.length ? Math.round((vencidos.length / titulos.length) * 100) : 0, color: '#ef4444' },
        { categoria: 'A Vencer', quantidade: aVencer.length, valor: aVencer.reduce((acc, t) => acc + (Number(t.valor) || 0), 0), percentual: titulos.length ? Math.round((aVencer.length / titulos.length) * 100) : 0, color: '#f59e0b' },
        { categoria: 'Recebidos Após Vencimento', quantidade: recebidosApos.length, valor: recebidosApos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0), percentual: titulos.length ? Math.round((recebidosApos.length / titulos.length) * 100) : 0, color: '#f97316' },
        { categoria: 'Recebidos até Vencimento', quantidade: recebidosAte.length, valor: recebidosAte.reduce((acc, t) => acc + (Number(t.valor) || 0), 0), percentual: titulos.length ? Math.round((recebidosAte.length / titulos.length) * 100) : 0, color: '#10b981' },
      ];

      const valorTotal = titulos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      const analiseFinanceira = {
        valorTotal,
        ticketMedio: titulos.length ? valorTotal / titulos.length : 0,
        taxaRecebimento: titulos.length ? Math.round((titulos.filter(t => t.status?.toUpperCase() === 'PAGO').length / titulos.length) * 100) : 0
      };

      const clientsRiskQuery = await query(`
        SELECT 
          c.id,
          COUNT(t.id) as qtd_vencidos
        FROM clientes c
        JOIN titulos t ON c.codigo_omie = t.codigo_cliente_omie AND t.empresa_id = c.empresa_id
        WHERE t.empresa_id = $1 AND UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento < $2
        GROUP BY c.id
      `, [empresaId, h_today]);

      let countBaixo = 0; let countMedio = 0; let countAlto = 0;
      for (const row of clientsRiskQuery.rows) {
        const qtd = Number(row.qtd_vencidos);
        if (qtd === 1) countBaixo++;
        else if (qtd === 2) countMedio++;
        else if (qtd >= 3) countAlto++;
      }

      const totalRisks = countBaixo + countMedio + countAlto;
      const riskPercent = (count: number) => totalRisks > 0 ? Math.round((count / totalRisks) * 100) : 0;

      const riscoClientes = [
        { nivel: 'Baixo Risco', percentual: riskPercent(countBaixo), detalhe: '1 título vencido', quantidade: countBaixo, color: 'emerald' },
        { nivel: 'Médio Risco', percentual: riskPercent(countMedio), detalhe: '2 títulos vencidos', quantidade: countMedio, color: 'amber' },
        { nivel: 'Alto Risco', percentual: riskPercent(countAlto), detalhe: '3 ou mais títulos vencidos', quantidade: countAlto, color: 'red' },
      ];

      res.json({ totalAReceber, resumoContas, analiseFinanceira, riscoClientes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Buscar Risco de Clientes por Nivel (Dashboard)
   */
  async getContasReceberRisco(req: Request, res: Response) {
    const { nivel } = req.params;
    const empresaId = res.locals.empresaId;

    try {
      let minOverdue = 1;
      let maxOverdue = 1;

      if (nivel === 'Médio Risco') {
        minOverdue = 2; maxOverdue = 2;
      } else if (nivel === 'Alto Risco') {
        minOverdue = 3; maxOverdue = 999;
      }

      const getIsoDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };

      const h_today_2 = getIsoDate(new Date());

      const clientsWithRiskResult = await query(`
        SELECT 
          c.id, c.nome_fantasia as nome, TO_CHAR(MIN(t.data_vencimento), 'YYYY-MM-DD') as vencimento,
          COUNT(t.id) as qtd_vencidos, SUM(t.valor_documento) as valor_total_vencido
        FROM clientes c
        JOIN titulos t ON c.codigo_omie = t.codigo_cliente_omie AND t.empresa_id = c.empresa_id
        WHERE t.empresa_id = $1 AND UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento < $2
        GROUP BY c.id
        HAVING COUNT(t.id) >= $3 AND COUNT(t.id) <= $4
      `, [empresaId, h_today_2, minOverdue, maxOverdue]);

      const clientsWithRisk = clientsWithRiskResult.rows;

      const results = await Promise.all(clientsWithRisk.map(async (client) => {
        const titlesResult = await query(`
          SELECT *, valor_documento as valor, status_titulo as status FROM titulos 
          WHERE empresa_id = $1 AND codigo_cliente_omie = (SELECT codigo_omie FROM clientes WHERE id = $2 AND empresa_id = $1)
          AND UPPER(status_titulo) != 'PAGO' AND data_vencimento < $3
          ORDER BY data_vencimento ASC
        `, [empresaId, client.id, h_today_2]);

        return { ...client, titles: titlesResult.rows };
      }));

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Painel de Controle (Metricas gerais de envio de email e Logs)
   */
  async getPainel(req: Request, res: Response) {
    try {
      const lastMetricaResult = await query('SELECT * FROM metricas ORDER BY data DESC LIMIT 1');
      const lastMetrica = lastMetricaResult.rows[0];

      const metrics = [
        { id: 1, nome: 'WhatsApp Enviados', valor: lastMetrica?.whatsapps_enviados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
        { id: 2, nome: 'E-mails Enviados', valor: lastMetrica?.emails_enviados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
        { id: 3, nome: 'Acordos Fechados', valor: lastMetrica?.acordos_fechados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
        { id: 4, nome: 'Taxa de Entrega', valor: `${(Number(lastMetrica?.taxa_entrega) || 0).toFixed(1)}%`, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
      ];

      // Logs removidos do front-end por questões de segurança (Acessados apenas no banco de dados)
      res.json({ metrics, logs: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
