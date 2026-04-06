/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusTitulo = 'pago' | 'pendente' | 'vencido' | 'atrasado';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  plano: string;
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  documento: string;
  telefone: string;
}

export interface Disparo {
  id: string;
  data: string;
  canal: 'whatsapp' | 'email';
  conteudo: string;
}

export interface Acordo {
  id: string;
  tituloId: string;
  descricao: string;
  dataPrimeiraParcela: string;
  numeroParcelas: number;
  valorParcela: number;
  observacoes: string;
  mensagensCobranca: {
    emailPre: string;
    emailPos: string;
    whatsappPre: string;
    whatsappPos: string;
  };
}

export interface Titulo {
  id: string;
  empresaId: string;
  clienteId: string;
  clienteNome: string;
  numeroNF: string;
  valor: number;
  dataVencimento: string;
  dataEmissao: string;
  dataPagamento?: string;
  status: StatusTitulo;
  // Novos campos solicitados
  valorEmAberto: number;
  valorPago: number;
  valorComDesconto: number;
  historicoDisparos: Disparo[];
}

export interface RegraCobranca {
  id: string;
  nome: string;
  dias: number; // positivo para depois do vencimento, negativo para antes
  canal: 'whatsapp' | 'email' | 'sms';
  templateId: string;
  ativa: boolean;
}

export interface TemplateMensagem {
  id: string;
  nome: string;
  canal: 'whatsapp' | 'email' | 'sms';
  conteudo: string;
}

export interface MetricaUtilizacao {
  data: string;
  whatsapp: number;
  email: number;
  sms: number;
}
