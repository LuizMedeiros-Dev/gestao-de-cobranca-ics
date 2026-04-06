import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'cobranca';

function limparTelefone(telefone: string): string {
  // Remove tudo que não é dígito e garante código do país
  const digits = telefone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export const whatsappService = {
  async enviar({ phone, message }: { phone: string; message: string }) {
    if (!EVOLUTION_KEY || EVOLUTION_KEY === 'sua_api_key_aqui') {
      console.warn('[WhatsApp] Evolution API não configurada. Simulando envio para:', phone);
      return { simulado: true, phone };
    }

    const numero = limparTelefone(phone);

    try {
      const response = await axios.post(
        `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
        {
          number: numero,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: message },
        },
        {
          headers: {
            apikey: EVOLUTION_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      console.log(`[WhatsApp] Enviado para ${numero}`);
      return response.data;
    } catch (err: any) {
      console.error(`[WhatsApp] Erro ao enviar para ${numero}:`, err?.response?.data || err.message);
      throw new Error(err?.response?.data?.message || err.message);
    }
  },

  async verificarConexao() {
    if (!EVOLUTION_KEY || EVOLUTION_KEY === 'sua_api_key_aqui') {
      return { ok: false, motivo: 'Evolution API não configurada no .env' };
    }
    try {
      const response = await axios.get(
        `${EVOLUTION_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
        { headers: { apikey: EVOLUTION_KEY }, timeout: 5000 }
      );
      const state = response.data?.instance?.state;
      return { ok: state === 'open', estado: state };
    } catch (err: any) {
      return { ok: false, motivo: err?.message };
    }
  },
};
