import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database.ts';
import { EMPRESA_IDS } from '../config/empresas.ts';
import { cobrancaService } from '../services/cobrancaService.ts';


const router = Router();

// Middleware: lê X-Empresa-Id e injeta em res.locals
router.use((req: Request, res: Response, next: NextFunction) => {
  const empresaId = (req.headers['x-empresa-id'] as string) || 'ics';
  res.locals.empresaId = EMPRESA_IDS.includes(empresaId) ? empresaId : 'ics';
  next();
});

/**
 * Health Check
 */
router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
      hint: 'Verifique se a DATABASE_URL está correta nas configurações do ambiente.'
    });
  }
});

/**
 * Dashboard Statistics
 */
router.get('/dashboard', async (req, res) => {
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
        COALESCE(SUM(CASE WHEN status_titulo != 'PAGO' THEN valor_documento ELSE 0 END), 0) as total_receber,
        COALESCE(SUM(CASE WHEN status_titulo = 'PAGO' THEN valor_documento ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN status_titulo != 'PAGO' AND data_vencimento < CURRENT_DATE THEN valor_documento ELSE 0 END), 0) as total_vencido,
        COALESCE(SUM(CASE WHEN status_titulo != 'PAGO' AND data_vencimento < CURRENT_DATE - INTERVAL '5 days' THEN valor_documento ELSE 0 END), 0) as total_atrasado
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
});

/**
 * Titles Management
 */
router.get('/titulos', async (req, res) => {
  const { status, search } = req.query;
  const empresaId = res.locals.empresaId;

  let sql = `
    SELECT t.*, c.nome_fantasia as cliente,
           t.valor_documento as valor_documento, t.status_titulo as status_titulo,
           CASE
             WHEN t.status_titulo = 'PAGO' THEN 'PAGO'
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
        if (s === 'A VENCER') conditions.push(`(t.status_titulo != 'PAGO' AND t.data_vencimento > CURRENT_DATE)`);
        else if (s === 'VENCE HOJE') conditions.push(`(t.status_titulo != 'PAGO' AND t.data_vencimento = CURRENT_DATE)`);
        else if (s === 'ATRASADO') conditions.push(`(t.status_titulo != 'PAGO' AND t.data_vencimento < CURRENT_DATE)`);
        else if (s === 'PAGO') conditions.push(`t.status_titulo = 'PAGO'`);
        else {
          conditions.push(`t.status_titulo = $${params.length + 1}`);
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

  // empresa_id já filtrado no WHERE inicial (params[0])

  sql += ` ORDER BY t.data_vencimento DESC`;

  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/titulos', async (req, res) => {
  const { cliente, numero_documento, valor_documento, data_vencimento, data_emissao, status_titulo } = req.body;

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
    console.error('Error creating title:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/titulos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`
      SELECT t.*, c.nome_fantasia as cliente,
             t.valor_documento as valor_documento, t.status_titulo as status_titulo,
             CASE
               WHEN t.status_titulo = 'PAGO' THEN 'PAGO'
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
    // Busca histórico real da tabela cobrancas_enviadas
    const historicoResult = await query(
      'SELECT * FROM cobrancas_enviadas WHERE titulo_id = $1 ORDER BY data_envio DESC',
      [id]
    );
    titulo.historico = historicoResult.rows;

    res.json(titulo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/titulos/:id', async (req, res) => {
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
});

router.delete('/titulos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM titulos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Agreements (Acordos)
 */
router.get('/titulos/:id/acordos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM acordos WHERE titulo_id = $1 ORDER BY data_acordo DESC', [id]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/titulos/:id/acordos', async (req, res) => {
  const { id } = req.params;
  const { descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela, observacoes } = req.body;
  try {
    const result = await query(`
      INSERT INTO acordos (titulo_id, descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [id, descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela ? data_primeira_parcela : null, observacoes]);

    await query('UPDATE metricas SET acordos_fechados = acordos_fechados + 1 WHERE data = CURRENT_DATE');

    res.json({ id: result.rows[0].id, success: true });
  } catch (error: any) {
    console.error('Error creating agreement:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/acordos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM acordos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/acordos/:id', async (req, res) => {
  const { id } = req.params;
  const { descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela, observacoes, status } = req.body;
  try {
    await query(`
      UPDATE acordos 
      SET descricao = $1, valor_total = $2, numero_parcelas = $3, valor_parcela = $4, data_primeira_parcela = $5, observacoes = $6, status = $7
      WHERE id = $8
    `, [descricao, valor_total, numero_parcelas, valor_parcela, data_primeira_parcela ? data_primeira_parcela : null, observacoes, status || 'Ativo', id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * User Profile
 */
router.get('/user', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users LIMIT 1');
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/user', async (req, res) => {
  const { nome, email } = req.body;
  try {
    await query('UPDATE users SET nome = $1, email = $2 WHERE id = (SELECT id FROM users LIMIT 1)', [nome, email]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/user/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await query('SELECT password FROM users LIMIT 1');
    const user = result.rows[0];

    if (user.password && user.password !== currentPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    await query('UPDATE users SET password = $1 WHERE id = (SELECT id FROM users LIMIT 1)', [newPassword]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Financial Summary (Contas a Receber)
 */
router.get('/contas-receber', async (req, res) => {
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

    const today = new Date().toISOString().split('T')[0];
    const vencidos = titulos.filter(t => {
      const dv = new Date(t.data_vencimento).toISOString().split('T')[0];
      return t.status?.toUpperCase() !== 'PAGO' && dv < today;
    });
    const aVencer = titulos.filter(t => {
      const dv = new Date(t.data_vencimento).toISOString().split('T')[0];
      return t.status?.toUpperCase() !== 'PAGO' && dv >= today;
    });
    const recebidosApos = titulos.filter(t => {
      if (t.status?.toUpperCase() !== 'PAGO' || !t.data_pagamento) return false;
      const dp = new Date(t.data_pagamento).toISOString().split('T')[0];
      const dv = new Date(t.data_vencimento).toISOString().split('T')[0];
      return dp > dv;
    });
    const recebidosAte = titulos.filter(t => {
      if (t.status?.toUpperCase() !== 'PAGO' || !t.data_pagamento) return false;
      const dp = new Date(t.data_pagamento).toISOString().split('T')[0];
      const dv = new Date(t.data_vencimento).toISOString().split('T')[0];
      return dp <= dv;
    });

    const resumoContas = [
      {
        categoria: 'Títulos Totais',
        quantidade: titulos.length,
        valor: titulos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0),
        percentual: 100,
        color: '#3b82f6'
      },
      {
        categoria: 'Vencidos',
        quantidade: vencidos.length,
        valor: vencidos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0),
        percentual: titulos.length ? Math.round((vencidos.length / titulos.length) * 100) : 0,
        color: '#ef4444'
      },
      {
        categoria: 'A Vencer',
        quantidade: aVencer.length,
        valor: aVencer.reduce((acc, t) => acc + (Number(t.valor) || 0), 0),
        percentual: titulos.length ? Math.round((aVencer.length / titulos.length) * 100) : 0,
        color: '#f59e0b'
      },
      {
        categoria: 'Recebidos Após Vencimento',
        quantidade: recebidosApos.length,
        valor: recebidosApos.reduce((acc, t) => acc + (Number(t.valor) || 0), 0),
        percentual: titulos.length ? Math.round((recebidosApos.length / titulos.length) * 100) : 0,
        color: '#f97316'
      },
      {
        categoria: 'Recebidos até Vencimento',
        quantidade: recebidosAte.length,
        valor: recebidosAte.reduce((acc, t) => acc + (Number(t.valor) || 0), 0),
        percentual: titulos.length ? Math.round((recebidosAte.length / titulos.length) * 100) : 0,
        color: '#10b981'
      },
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
    `, [empresaId, today]);

    let countBaixo = 0;
    let countMedio = 0;
    let countAlto = 0;

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

    res.json({
      totalAReceber,
      resumoContas,
      analiseFinanceira,
      riscoClientes
    });
  } catch (error: any) {
    console.error('Erro em /contas-receber:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/contas-receber/risco/:nivel', async (req, res) => {
  const { nivel } = req.params;
  const empresaId = res.locals.empresaId;

  try {
    let minOverdue = 1;
    let maxOverdue = 1;

    if (nivel === 'Médio Risco') {
      minOverdue = 2;
      maxOverdue = 2;
    } else if (nivel === 'Alto Risco') {
      minOverdue = 3;
      maxOverdue = 999;
    }

    const today = new Date().toISOString().split('T')[0];

    const clientsWithRiskResult = await query(`
      SELECT 
        c.id,
        c.nome_fantasia as nome,
        TO_CHAR(MIN(t.data_vencimento), 'YYYY-MM-DD') as vencimento,
        COUNT(t.id) as qtd_vencidos,
        SUM(t.valor_documento) as valor_total_vencido
      FROM clientes c
      JOIN titulos t ON c.codigo_omie = t.codigo_cliente_omie AND t.empresa_id = c.empresa_id
      WHERE t.empresa_id = $1 AND UPPER(t.status_titulo) != 'PAGO' AND t.data_vencimento < $2
      GROUP BY c.id
      HAVING COUNT(t.id) >= $3 AND COUNT(t.id) <= $4
    `, [empresaId, today, minOverdue, maxOverdue]);

    const clientsWithRisk = clientsWithRiskResult.rows;

    const results = await Promise.all(clientsWithRisk.map(async (client) => {
      const titlesResult = await query(`
        SELECT *, valor_documento as valor, status_titulo as status FROM titulos 
        WHERE empresa_id = $1 AND codigo_cliente_omie = (SELECT codigo_omie FROM clientes WHERE id = $2 AND empresa_id = $1)
        AND UPPER(status_titulo) != 'PAGO' 
        AND data_vencimento < $3
        ORDER BY data_vencimento ASC
      `, [empresaId, client.id, today]);

      return {
        ...client,
        titles: titlesResult.rows
      };
    }));

    res.json(results);
  } catch (error: any) {
    console.error('Erro em /contas-receber/risco:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Templates Management
 */
router.get('/templates', async (req, res) => {
  try {
    const result = await query('SELECT * FROM templates');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  const { nome, tipo, conteudo } = req.body;
  try {
    const result = await query('INSERT INTO templates (nome, tipo, conteudo) VALUES ($1, $2, $3) RETURNING id', [nome, tipo, conteudo]);
    res.json({ id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, tipo, conteudo } = req.body;
  try {
    await query('UPDATE templates SET nome = $1, tipo = $2, conteudo = $3 WHERE id = $4', [nome, tipo, conteudo, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Collection Rules (Regras de Cobrança)
 */
router.get('/regras', async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, t.nome as template_nome, t.tipo as canal
      FROM regras_cobranca r
      LEFT JOIN templates t ON r.template_id = t.id
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/regras', async (req, res) => {
  const { nome, canal, dias_atraso, template_id } = req.body;
  try {
    const result = await query(`
      INSERT INTO regras_cobranca (nome, canal, dias_atraso, template_id) 
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nome, canal, dias_atraso, template_id]);
    res.json({ id: result.rows[0].id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/regras/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const keys = Object.keys(updates);
  const values = Object.values(updates);

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  try {
    await query(`UPDATE regras_cobranca SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/regras/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM regras_cobranca WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * General System Configuration
 */
router.get('/config', async (req, res) => {
  try {
    const result = await query('SELECT value FROM config WHERE key = $1', ['app_name']);
    const app_name = result.rows[0];
    res.json({ app_name: app_name?.value || 'Sistema de Cobrança' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req, res) => {
  const { app_name } = req.body;
  try {
    await query(`
      INSERT INTO config (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, ['app_name', app_name]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Control Panel Metrics and Logs
 */
router.get('/painel', async (req, res) => {
  try {
    const lastMetricaResult = await query('SELECT * FROM metricas ORDER BY data DESC LIMIT 1');
    const lastMetrica = lastMetricaResult.rows[0];

    const metrics = [
      { id: 1, nome: 'WhatsApp Enviados', valor: lastMetrica?.whatsapps_enviados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
      { id: 2, nome: 'E-mails Enviados', valor: lastMetrica?.emails_enviados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
      { id: 3, nome: 'Acordos Fechados', valor: lastMetrica?.acordos_fechados || 0, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
      { id: 4, nome: 'Taxa de Entrega', valor: `${(Number(lastMetrica?.taxa_entrega) || 0).toFixed(1)}%`, ultima_atualizacao: lastMetrica?.data || new Date().toISOString() },
    ];

    const logsResult = await query('SELECT id, timestamp as data, tipo, mensagem as acao, detalhes FROM logs ORDER BY timestamp DESC LIMIT 20');

    res.json({ metrics, logs: logsResult.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Authentication and Users
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE (email = $1 OR cpf = $1 OR nome = $1) AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
  const { nome, cpf, email, password } = req.body;
  try {
    await query(`
      INSERT INTO users (nome, email, cpf, password, cargo) 
      VALUES ($1, $2, $3, $4, 'Administrador')
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, cpf = EXCLUDED.cpf, nome = EXCLUDED.nome
    `, [nome, email, cpf, password]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clientes
 */
router.get('/clientes', async (req, res) => {
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
});

router.get('/clientes/:id', async (req, res) => {
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
});

router.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { email, telefone } = req.body;
  try {
    await query('UPDATE clientes SET email = $1, telefone = $2 WHERE id = $3', [email, telefone, id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



/**
 * Disparo Manual e Status de Pagamento
 */
router.post('/titulos/:id/cobrar', async (req, res) => {
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
});


router.get('/titulos/:id/historico', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'SELECT * FROM cobrancas_enviadas WHERE titulo_id = $1 ORDER BY data_envio DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



/**
 * Projeção de Fluxo de Caixa
 */
router.get('/dashboard/projecao', async (req, res) => {
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
});

/**
 * Status dos Provedores de Envio
 */
router.get('/provedores/status', async (req, res) => {
  const { emailService } = await import('../services/emailService.ts');
  const { whatsappService } = await import('../services/whatsappService.ts');
  const [email, whatsapp] = await Promise.all([
    emailService.verificarConexao(),
    whatsappService.verificarConexao(),
  ]);
  res.json({ email, whatsapp });
});

/**
 * Disparar regras manualmente
 */
router.post('/cobranca/executar', async (req, res) => {
  const empresaId = res.locals.empresaId;
  try {
    const resultado = await cobrancaService.executarRegrasCobranca(empresaId);
    res.json({ success: true, ...resultado });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
