import { query } from '../config/database.ts';
import { emailService } from './emailService.ts';
import { whatsappService } from './whatsappService.ts';

function substituirVariaveis(template: string, dados: Record<string, string>) {
  return template
    .replace(/\{cliente\}/gi, dados.cliente || '')
    .replace(/\{valor\}/gi, dados.valor || '')
    .replace(/\{vencimento\}/gi, dados.vencimento || '')
    .replace(/\{nf\}/gi, dados.nf || '')
    .replace(/\{dias_atraso\}/gi, dados.dias_atraso || '');
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data: any) {
  if (!data) return '';
  if (data instanceof Date) return data.toLocaleDateString('pt-BR');
  if (typeof data === 'string') {
    const isIso = data.includes('T');
    const d = new Date(isIso ? data : data + 'T00:00:00');
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
    return data;
  }
  return String(data);
}

export const cobrancaService = {
  async getTitulosVencidos(empresaId: string = 'ics') {
    const result = await query(`
      SELECT t.*, c.razao_social, c.nome_fantasia, c.email, c.telefone
      FROM titulos t
      JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie AND c.empresa_id = t.empresa_id
      WHERE t.empresa_id = $1
        AND UPPER(t.status_titulo) NOT IN ('PAGO', 'CANCELADO')
        AND t.data_vencimento < CURRENT_DATE
      ORDER BY t.data_vencimento ASC
    `, [empresaId]);
    return result.rows;
  },

  async executarRegrasCobranca(empresaId: string = 'ics') {
    console.log(`[Cobrança] Executando regras para empresa '${empresaId}'...`);

    // Busca regras ativas com template
    const regrasResult = await query(`
      SELECT r.*, t.conteudo as template_conteudo, t.nome as template_nome
      FROM regras_cobranca r
      JOIN templates t ON r.template_id = t.id
      WHERE r.ativo = true
      ORDER BY r.dias_atraso ASC
    `);
    const regras = regrasResult.rows;

    if (regras.length === 0) {
      console.log('[Cobrança] Nenhuma regra ativa encontrada.');
      return { disparos: 0 };
    }

    const hoje = new Date().toISOString().split('T')[0];
    let totalDisparos = 0;

    for (const regra of regras) {
      // Busca títulos que se encaixam na regra (dias de atraso)
      const titulosResult = await query(`
        SELECT t.*, 
               COALESCE(c.nome_fantasia, c.razao_social) as nome_cliente,
               c.email as email_cliente, 
               c.telefone as telefone_cliente
        FROM titulos t
        JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie AND c.empresa_id = t.empresa_id
        WHERE t.empresa_id = $1
          AND UPPER(t.status_titulo) NOT IN ('PAGO', 'CANCELADO')
          AND t.data_vencimento = CURRENT_DATE + (${regra.dias_atraso} * INTERVAL '-1 day')
      `, [empresaId]);

      for (const titulo of titulosResult.rows) {
        // Verifica se já foi enviado hoje com esta regra
        const jaEnviado = await query(`
          SELECT id FROM cobrancas_enviadas
          WHERE titulo_id = $1 AND tipo_envio = $2 AND DATE(data_envio) = $3
        `, [titulo.id, `regra_${regra.id}_${regra.canal}`, hoje]);

        if (jaEnviado.rows.length > 0) continue;

        const dataVenc = titulo.data_vencimento instanceof Date ? titulo.data_vencimento : new Date(titulo.data_vencimento + 'T00:00:00');
        const diasAtraso = Math.floor(
          (new Date().getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24)
        );

        const variaveis = {
          cliente: titulo.nome_cliente || '',
          valor: formatarMoeda(parseFloat(titulo.valor_documento)),
          vencimento: formatarData(titulo.data_vencimento),
          nf: titulo.numero_documento || '',
          dias_atraso: String(diasAtraso),
        };

        const mensagem = substituirVariaveis(regra.template_conteudo, variaveis);
        let enviado = false;
        let erro = '';

        try {
          if (regra.canal === 'email' && titulo.email_cliente) {
            const paragrafos = mensagem
              .split('\n')
              .filter(l => l.trim())
              .map(l => `<p>${l.trim()}</p>`)
              .join('\n');
            await emailService.enviar({
              to: titulo.email_cliente,
              subject: `Aviso de Cobrança — NF ${titulo.numero_documento}`,
              html: paragrafos,
              variaveis,
            });
            enviado = true;
          } else if (regra.canal === 'whatsapp' && titulo.telefone_cliente) {
            await whatsappService.enviar({ phone: titulo.telefone_cliente, message: mensagem });
            enviado = true;
          }
        } catch (err: any) {
          erro = err.message;
          console.error(`[Cobrança] Erro ao enviar ${regra.canal} para título ${titulo.id}:`, err.message);
        }

        // Grava o registro de envio (seja sucesso ou falha)
        await query(`
          INSERT INTO cobrancas_enviadas (titulo_id, tipo_envio, status, detalhes)
          VALUES ($1, $2, $3, $4)
        `, [
          titulo.id,
          `regra_${regra.id}_${regra.canal}`,
          enviado ? 'ENVIADO' : 'ERRO',
          erro || `Regra: ${regra.nome} | Canal: ${regra.canal}`
        ]);

        if (enviado) {
          totalDisparos++;
          // Atualiza métricas de envio
          const coluna = regra.canal === 'email' ? 'emails_enviados' : 'whatsapps_enviados';
          await query(`
            INSERT INTO metricas (data, ${coluna}) VALUES (CURRENT_DATE, 1)
            ON CONFLICT (data) DO UPDATE SET ${coluna} = metricas.${coluna} + 1
          `);
        }
      }
    }

    console.log(`[Cobrança] Total de disparos realizados: ${totalDisparos}`);
    return { disparos: totalDisparos };
  },

  async cobrarTituloManual(tituloId: number, canal: 'email' | 'whatsapp', mensagem: string) {
    const tituloResult = await query(`
      SELECT t.*, 
             COALESCE(c.nome_fantasia, c.razao_social) as nome_cliente,
             c.email as email_cliente,
             c.telefone as telefone_cliente
      FROM titulos t
      LEFT JOIN clientes c ON t.codigo_cliente_omie = c.codigo_omie AND c.empresa_id = t.empresa_id
      WHERE t.id = $1
    `, [tituloId]);

    if (tituloResult.rows.length === 0) throw new Error('Título não encontrado');
    const titulo = tituloResult.rows[0];

    // Substitui variáveis do template exatamente como nos disparos automáticos
    const dataVenc = titulo.data_vencimento instanceof Date ? titulo.data_vencimento : new Date(titulo.data_vencimento + 'T00:00:00');
    const diasAtraso = Math.floor(
      (new Date().getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24)
    );
    const variaveis = {
      cliente: titulo.nome_cliente || '',
      valor: formatarMoeda(parseFloat(titulo.valor_documento)),
      vencimento: formatarData(titulo.data_vencimento),
      nf: titulo.numero_documento || '',
      dias_atraso: String(Math.max(0, diasAtraso)),
    };
    const mensagemFinal = substituirVariaveis(mensagem, variaveis);

    let enviado = false;
    let erro = '';

    try {
      if (canal === 'email') {
        if (!titulo.email_cliente) throw new Error('Cliente sem e-mail cadastrado');
        const paragrafos = mensagemFinal
          .split('\n')
          .filter(l => l.trim())
          .map(l => `<p>${l.trim()}</p>`)
          .join('\n');
        await emailService.enviar({
          to: titulo.email_cliente,
          subject: `Aviso de Cobrança — NF ${titulo.numero_documento}`,
          html: paragrafos,
          variaveis,
        });
        enviado = true;
      } else if (canal === 'whatsapp') {
        if (!titulo.telefone_cliente) throw new Error('Cliente sem telefone cadastrado');
        await whatsappService.enviar({ phone: titulo.telefone_cliente, message: mensagemFinal });
        enviado = true;
      }
    } catch (err: any) {
      erro = err.message;
      throw err;
    } finally {
      await query(`
        INSERT INTO cobrancas_enviadas (titulo_id, tipo_envio, status, detalhes)
        VALUES ($1, $2, $3, $4)
      `, [tituloId, `manual_${canal}`, enviado ? 'ENVIADO' : 'ERRO', erro || 'Disparo manual']);
      // Atualiza métricas de envio
      if (enviado) {
        const coluna = canal === 'email' ? 'emails_enviados' : 'whatsapps_enviados';
        await query(`
          INSERT INTO metricas (data, ${coluna}) VALUES (CURRENT_DATE, 1)
          ON CONFLICT (data) DO UPDATE SET ${coluna} = metricas.${coluna} + 1
        `);
      }
    }

    return { ok: true, canal, destinatario: canal === 'email' ? titulo.email_cliente : titulo.telefone_cliente };
  },
};
