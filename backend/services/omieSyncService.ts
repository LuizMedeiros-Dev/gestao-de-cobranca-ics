import { createOmieClient } from '../integrations/omieClient.ts';
import { getEmpresaConfig, EMPRESA_IDS } from '../config/empresas.ts';
import { query } from '../config/database.ts';


function normalizeDate(d: string | null): string | null {
  if (!d) return null;
  // Se já estiver no formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split('T')[0];
  // Se estiver no formato DD/MM/YYYY
  const parts = d.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return d;
}

function mapOmieStatus(status: string): string {
  if (!status) return 'ABERTO';
  const s = status.toUpperCase();
  if (s === 'LIQUIDADO' || s === 'RECEBIDO') return 'PAGO';
  if (s === 'CANCELADO' || s === 'EXCLUIDO') return 'CANCELADO';
  return s;
}

function extractPaymentDate(titulo: any): string | null {
  const status = (titulo.status_titulo || '').toUpperCase();
  if (status !== 'RECEBIDO' && status !== 'LIQUIDADO' && status !== 'PAGO') {
    return null;
  }
  // Tenta várias fontes comuns de data de pagamento no Omie
  const date = titulo.data_pagamento || titulo.data_liquidacao || titulo.baixa_resumo?.data_liquidacao || titulo.info?.dAlt || null;
  return normalizeDate(date);
}

export const omieSyncService = {
  async createTables() {
    // Adiciona coluna empresa_id se ainda não existir
    await query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'ics';
    `);
    await query(`
      ALTER TABLE titulos ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'ics';
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        email TEXT UNIQUE,
        cargo TEXT,
        foto_url TEXT,
        cpf TEXT,
        password TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        tipo TEXT,
        conteudo TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        empresa_id TEXT DEFAULT 'ics',
        codigo_omie BIGINT,
        razao_social TEXT,
        nome_fantasia TEXT,
        cnpj_cpf TEXT,
        email TEXT,
        telefone TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(empresa_id, codigo_omie)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS titulos (
        id SERIAL PRIMARY KEY,
        empresa_id TEXT DEFAULT 'ics',
        codigo_omie BIGINT,
        codigo_cliente_omie BIGINT,
        cliente_id INTEGER,
        numero_documento TEXT,
        data_vencimento DATE,
        valor_documento DECIMAL(15,2),
        status_titulo TEXT,
        data_emissao DATE,
        data_pagamento DATE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(empresa_id, codigo_omie)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS acordos (
        id SERIAL PRIMARY KEY,
        titulo_id INTEGER REFERENCES titulos(id),
        descricao TEXT,
        data_acordo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valor_total DECIMAL(15,2),
        numero_parcelas INTEGER,
        valor_parcela DECIMAL(15,2),
        data_primeira_parcela DATE,
        observacoes TEXT,
        mensagem_email TEXT,
        mensagem_whatsapp TEXT,
        status TEXT DEFAULT 'Ativo'
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS cobrancas_enviadas (
        id SERIAL PRIMARY KEY,
        titulo_id INTEGER REFERENCES titulos(id),
        tipo_envio TEXT,
        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        detalhes TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS regras_cobranca (
        id SERIAL PRIMARY KEY,
        nome TEXT,
        dias_atraso INTEGER,
        canal TEXT,
        template_id INTEGER REFERENCES templates(id),
        ativo BOOLEAN DEFAULT TRUE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo TEXT,
        mensagem TEXT,
        detalhes TEXT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS metricas (
        id SERIAL PRIMARY KEY,
        data DATE DEFAULT CURRENT_DATE,
        whatsapps_enviados INTEGER DEFAULT 0,
        emails_enviados INTEGER DEFAULT 0,
        acordos_fechados INTEGER DEFAULT 0,
        taxa_entrega DECIMAL(5,2) DEFAULT 0
      );
    `);

    // Seeds
    await query(`
      INSERT INTO users (nome, email, cargo, password)
      VALUES ('Luiz Fellipe', 'luizfellipesilvamedeiros@gmail.com', 'Administrador', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);

    await query(`
      INSERT INTO config (key, value)
      VALUES ('app_name', 'Sistema de Cobrança')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Migrações para bases existentes
    await query(`ALTER TABLE cobrancas_enviadas ADD COLUMN IF NOT EXISTS detalhes TEXT;`);
    try {
      await query(`ALTER TABLE metricas ADD CONSTRAINT metricas_data_unique UNIQUE (data);`);
    } catch { /* constraint já existe */ }

    // Migrações para garantir constraint composta (empresa_id, codigo_omie)
    try {
      await query(`ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_codigo_omie_key CASCADE;`);
      await query(`ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_empresa_id_codigo_omie_key CASCADE;`);
      await query(`ALTER TABLE clientes ADD CONSTRAINT clientes_empresa_id_codigo_omie_key UNIQUE(empresa_id, codigo_omie);`);
    } catch { /* ignora */ }

    try {
      await query(`ALTER TABLE titulos DROP CONSTRAINT IF EXISTS titulos_codigo_omie_key CASCADE;`);
      await query(`ALTER TABLE titulos DROP CONSTRAINT IF EXISTS titulos_empresa_id_codigo_omie_key CASCADE;`);
      await query(`ALTER TABLE titulos ADD CONSTRAINT titulos_empresa_id_codigo_omie_key UNIQUE(empresa_id, codigo_omie);`);
    } catch { /* ignora */ }
  },

  async syncClientes(empresaId: string) {
    const config = getEmpresaConfig(empresaId);
    if (!config.omieAppKey || !config.omieAppSecret) {
      throw new Error(`Chaves OMIE não configuradas para a empresa '${config.nome}'. Preencha no arquivo .env.`);
    }

    const client = createOmieClient(config.omieAppKey, config.omieAppSecret);
    let pagina = 1;
    let totalPaginas = 1;

    do {
      try {
        const data = await client.listarClientes(pagina);
        totalPaginas = data.total_de_paginas;

        for (const cliente of data.clientes_cadastro || []) {
          await query(
            `INSERT INTO clientes (empresa_id, codigo_omie, razao_social, nome_fantasia, cnpj_cpf, email, telefone)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (empresa_id, codigo_omie) DO UPDATE SET
               razao_social = EXCLUDED.razao_social,
               nome_fantasia = EXCLUDED.nome_fantasia,
               cnpj_cpf = EXCLUDED.cnpj_cpf,
               email = EXCLUDED.email,
               telefone = EXCLUDED.telefone`,
            [
              empresaId,
              cliente.codigo_cliente_omie,
              cliente.razao_social,
              cliente.nome_fantasia,
              cliente.cnpj_cpf,
              cliente.email,
              cliente.telefone1,
            ]
          );
        }
        pagina++;
      } catch (err: any) {
        if (err.response?.data?.faultcode === 'SOAP-ENV:Client-5113') {
          console.log(`[OmieSync] Empresa ${empresaId}: Nenhum cliente encontrado (página ${pagina}).`);
          break;
        }
        throw err;
      }
    } while (pagina <= totalPaginas);
  },

  async syncTitulos(empresaId: string) {
    const config = getEmpresaConfig(empresaId);
    if (!config.omieAppKey || !config.omieAppSecret) {
      throw new Error(`Chaves OMIE não configuradas para a empresa '${config.nome}'. Preencha no arquivo .env.`);
    }

    const client = createOmieClient(config.omieAppKey, config.omieAppSecret);
    let pagina = 1;
    let totalPaginas = 1;

    do {
      try {
        const data = await client.listarContasReceber(pagina);
        totalPaginas = data.total_de_paginas;

        for (const titulo of data.conta_receber_cadastro || []) {
          await query(
            `INSERT INTO titulos (empresa_id, codigo_omie, codigo_cliente_omie, numero_documento, data_vencimento, valor_documento, status_titulo, data_emissao, data_pagamento)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (empresa_id, codigo_omie) DO UPDATE SET
               codigo_cliente_omie = EXCLUDED.codigo_cliente_omie,
               numero_documento = EXCLUDED.numero_documento,
               data_vencimento = EXCLUDED.data_vencimento,
               valor_documento = EXCLUDED.valor_documento,
               status_titulo = EXCLUDED.status_titulo,
               data_emissao = EXCLUDED.data_emissao,
               data_pagamento = EXCLUDED.data_pagamento`,
            [
              empresaId,
              titulo.codigo_lancamento_omie,
              titulo.codigo_cliente_fornecedor,
              titulo.numero_documento,
              normalizeDate(titulo.data_vencimento),
              titulo.valor_documento,
              mapOmieStatus(titulo.status_titulo),
              normalizeDate(titulo.data_emissao),
              extractPaymentDate(titulo),
            ]
          );
        }
        pagina++;
      } catch (err: any) {
        if (err.response?.data?.faultcode === 'SOAP-ENV:Client-5113') {
          console.log(`[OmieSync] Empresa ${empresaId}: Nenhum título encontrado (página ${pagina}).`);
          break;
        }
        throw err;
      }
    } while (pagina <= totalPaginas);
  },

  async fullSync(empresaId: string = 'ics') {
    await this.createTables();
    await this.syncClientes(empresaId);
    await this.syncTitulos(empresaId);

    // Corrige títulos antigos com status 'LIQUIDADO'
    await query("UPDATE titulos SET status_titulo = 'PAGO' WHERE UPPER(status_titulo) = 'LIQUIDADO'");
  },

  /**
   * Remove do banco todos os clientes e títulos cujo empresa_id
   * não está na lista de empresas configuradas no .env.
   * Retorna um resumo do que foi excluído.
   */
  async purgeEmpresasInvalidas() {
    const idsValidos = EMPRESA_IDS; // ex: ['ics', 'authen', 'target']

    // Monta placeholders: $1, $2, $3 ...
    const n = idsValidos.length;
    const placeholders = idsValidos.map((_, i) => `$${i + 1}`).join(', ');
    // Placeholders com offset para o segundo SELECT do UNION
    const placeholders2 = idsValidos.map((_, i) => `$${n + i + 1}`).join(', ');

    // Busca quais empresa_ids órfãos existem (para logar)
    const orphansResult = await query(
      `SELECT DISTINCT empresa_id FROM titulos WHERE empresa_id NOT IN (${placeholders})
       UNION
       SELECT DISTINCT empresa_id FROM clientes WHERE empresa_id NOT IN (${placeholders2})`,
      [...idsValidos, ...idsValidos]
    );
    const orphanIds: string[] = orphansResult.rows.map((r: any) => r.empresa_id);

    if (orphanIds.length === 0) {
      return { removidos: 0, empresas_removidas: [] };
    }

    // Deleta cobrancas_enviadas ligadas a títulos órfãos (FK)
    await query(
      `DELETE FROM cobrancas_enviadas
       WHERE titulo_id IN (
         SELECT id FROM titulos WHERE empresa_id NOT IN (${placeholders})
       )`,
      idsValidos
    );

    // Deleta acordos ligados a títulos órfãos (FK)
    await query(
      `DELETE FROM acordos
       WHERE titulo_id IN (
         SELECT id FROM titulos WHERE empresa_id NOT IN (${placeholders})
       )`,
      idsValidos
    );

    // Deleta títulos órfãos
    const delTitulos = await query(
      `DELETE FROM titulos WHERE empresa_id NOT IN (${placeholders})`,
      idsValidos
    );

    // Deleta clientes órfãos
    const delClientes = await query(
      `DELETE FROM clientes WHERE empresa_id NOT IN (${placeholders})`,
      idsValidos
    );

    const total = (delTitulos.rowCount ?? 0) + (delClientes.rowCount ?? 0);
    console.log(`[OmieSync] Purge: removidos ${total} registros de empresas inválidas: ${orphanIds.join(', ')}`);

    return {
      removidos: total,
      titulos_removidos: delTitulos.rowCount ?? 0,
      clientes_removidos: delClientes.rowCount ?? 0,
      empresas_removidas: orphanIds,
    };
  },
};
