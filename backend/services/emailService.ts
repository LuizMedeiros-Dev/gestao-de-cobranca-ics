import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

function wrapHtmlProfissional(conteudo: string, subject: string, variaveis?: any, useCidHeader?: boolean): string {
  const ano = new Date().getFullYear();
  let detalhesEButton = '';

  const headerLogoHtml = useCidHeader ?
    `<img src="cid:logo_ics" alt="ICS 30 SAÚDE INTELIGENTE" style="max-height: 80px; width: auto; display: block; margin: 0 auto; margin-bottom: 24px;" />` :
    `<div class="header-logo" style="font-size: 54px; font-weight: 900; color: #1a365d; letter-spacing: -2px; line-height: 1; margin-bottom: 5px;">
      ICS<span class="header-logo-outline" style="color: transparent; -webkit-text-stroke: 1.5px #ff4d4f; margin-left: 4px;">30</span>
    </div>
    <div class="header-subtitle" style="font-size: 11px; font-weight: bold; color: #1a365d; letter-spacing: 4px;">SAÚDE INTELIGENTE</div>
    <div class="wave-container"></div>`;

  const footerLogoHtml = useCidHeader ?
    `<img src="cid:logo_ics" alt="ICS 30 SAÚDE INTELIGENTE" style="max-height: 40px; width: auto; display: block; margin: 0 auto 20px auto;" />` :
    `<div class="header-logo" style="font-size: 28px; font-weight: 900; color: #1a365d; letter-spacing: -1px; margin-bottom: 2px;">
      ICS<span class="header-logo-outline" style="color: transparent; -webkit-text-stroke: 1px #ff4d4f; margin-left: 2px;">30</span>
    </div>
    <div style="font-size: 7px; font-weight: bold; color: #1a365d; letter-spacing: 3px; margin-bottom: 24px;">SAÚDE INTELIGENTE</div>`;

  if (variaveis) {
    let waMessage = 'Olá! Gostaria do link/boleto para pagamento do(s) meu(s) título(s) em aberto.';
    if (variaveis.cliente || variaveis.nf) {
      const extraInfo = [];
      if (variaveis.cliente) extraInfo.push(`Cliente: ${variaveis.cliente}`);
      if (variaveis.nf) extraInfo.push(`NF: ${variaveis.nf}`);
      if (extraInfo.length > 0) waMessage += ` (${extraInfo.join(' | ')})`;
    }
    const waLink = `https://wa.me/5562998560045?text=${encodeURIComponent(waMessage)}`;

    detalhesEButton = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
        <tr>
          <td>
            <div style="background-color: #f0f2f5; border-radius: 12px; padding: 24px;">
              <h3 style="margin-top: 0; color: #1a365d; font-size: 16px; margin-bottom: 16px;">Detalhes da Cobrança</h3>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #4a5568;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Cliente:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${variaveis.cliente || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Serviço:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">Contrato</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Valor:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${variaveis.valor || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Data de Vencimento:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">${variaveis.vencimento || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>NF da Fatura:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">${variaveis.nf || ''}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 32px;">
            <a href="${waLink}" style="display: inline-block; background-color: #ff6b6b; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">PAGAR AGORA</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 16px; padding-bottom: 24px;">
            <p style="font-size: 13px; color: #718096; margin: 0; line-height: 1.5;">Clique no botão acima para realizar o pagamento da cobrança. Caso já tenha efetuado o pagamento, ignore esta mensagem.</p>
          </td>
        </tr>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f4f4f7; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { text-align: center; padding: 40px 20px 20px; position: relative; }
    .header-logo { font-size: 64px; font-weight: 900; color: #1a365d; letter-spacing: -3px; line-height: 1; }
    .header-logo-outline { background-color: #ffffff; color: transparent; -webkit-text-stroke: 2px #ff4d4f; }
    .header-subtitle { font-size: 12px; font-weight: bold; color: #1a365d; letter-spacing: 5px; margin-top: 4px; }
    /* Simple CSS wave since email clients strip complex things and SVGs are hit-or-miss */
    .wave-container { height: 12px; background: linear-gradient(90deg, #1a365d 0%, #3182ce 50%, #ff4d4f 100%); width: 100%; border-radius: 5px; margin-top: 20px; opacity: 0.9; }
    .body { padding: 32px 40px; color: #2d3748; font-size: 16px; line-height: 1.6; }
    .body h2 { color: #1a365d; margin-top: 0; }
    .body p { margin: 0 0 16px 0; }
    .support-box { background-color: #f8fafc; padding: 32px; text-align: center; border-radius: 12px; margin: 0 40px 40px; }
    .support-box h3 { margin: 0 0 8px 0; color: #1a365d; font-size: 18px; }
    .support-box p { margin: 0 0 20px 0; color: #4a5568; font-size: 14px; }
    .support-btn { display: inline-block; background-color: #4299e1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; }
    .footer { text-align: center; padding: 0 40px 40px; }
    .footer-text { color: #718096; font-size: 13px; line-height: 1.5; margin-bottom: 16px; }
    .footer-text a { color: #4299e1; text-decoration: none; }
    .social-icons { display: flex; justify-content: center; gap: 12px; align-items: center; }
    .icon { width: 32px; height: 32px; background-color: #e2e8f0; border-radius: 50%; display: inline-block; line-height: 32px; color: #4a5568; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header" ${useCidHeader ? 'style="text-align: center; padding: 40px 20px 20px; border-bottom: 1px solid #e2e8f0;"' : ''}>
        ${headerLogoHtml}
      </div>
      
      <div class="body">
        ${conteudo}
        ${detalhesEButton}
      </div>

      <div class="support-box">
        <h3>Precisa de ajuda? Estamos à disposição!</h3>
        <p>Entre em contato conosco caso tenha qualquer dúvida ou necessite de suporte.</p>
        <a href="mailto:financeiro@icsgo.com.br" class="support-btn">✉ Falar com o Suporte</a>
      </div>

      <div class="footer">
        ${footerLogoHtml}
        
        <div class="footer-text">
          (62) 9 9856-0045 | <a href="mailto:financeiro@icsgo.com.br">financeiro@icsgo.com.br</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Converte HTML simples em texto puro (plain text) para o fallback do e-mail.
 * Filtros de spam valorizam muito e-mails que possuem versão em texto puro.
 */
function htmlParaTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const emailService = {
  async enviar({ to, subject, html, variaveis }: { to: string; subject: string; html: string; variaveis?: any }) {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'seu@email.com') {
      console.warn('[Email] SMTP não configurado. Simulando envio para:', to);
      return { simulado: true, to };
    }

    // CIDs Support
    const logoRelPaths = ['assets/logo.png', 'backend/assets/logo.png', 'dist/assets/logo.png', 'public/logo.png'];
    let logoPath = '';
    for (const p of logoRelPaths) {
      if (fs.existsSync(path.join(process.cwd(), p))) {
        logoPath = path.join(process.cwd(), p);
        break;
      }
    }

    const conteudoHtml = html.includes('<!DOCTYPE') ? html : wrapHtmlProfissional(html, subject, variaveis, !!logoPath);
    const conteudoTexto = htmlParaTexto(html);

    const attachments = [];
    if (logoPath) {
      attachments.push({
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo_ics'
      });
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      replyTo: process.env.SMTP_USER,
      to,
      subject,
      text: conteudoTexto,
      html: conteudoHtml,
      attachments,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'ICS Cobranças v1.0',
        'Precedence': 'bulk',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=Cancelar>`,
      },
    });

    console.log(`[Email] Enviado para ${to} — ID: ${info.messageId}`);
    return info;
  },

  async verificarConexao() {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'seu@email.com') {
      return { ok: false, motivo: 'SMTP não configurado no .env' };
    }
    try {
      await transporter.verify();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, motivo: err.message };
    }
  },
};
