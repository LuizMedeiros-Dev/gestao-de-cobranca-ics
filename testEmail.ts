import { emailService } from './backend/services/emailService.ts';

async function teste() {
  console.log('Iniciando teste de envio de e-mail corporativo...');
  try {
    const conexao = await emailService.verificarConexao();
    if (!conexao.ok) {
      console.error('Erro na conexão com SMTP (Office365 Oficial):', conexao.motivo);
      return;
    }
    console.log('Conexão SMTP validada com sucesso via contato@icsgo.com.br!');

    const res = await emailService.enviar({
      to: 'luizics@outlook.com',
      subject: 'Teste Send-As - Remetente luiz@icsgo.com.br',
      html: '<p>Olá Luiz,</p><p>Vencemos a plataforma da Microsoft! Este e-mail de teste foi disparado da sua conta autorizada <b>contato@icsgo.com.br</b> exatamente como no seu Laravel.</p><p>Estou pronto para ir para produção e enviar cobranças aos clientes reais.</p>',
    });

    console.log('Resultado do envio:', res);
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

teste();
