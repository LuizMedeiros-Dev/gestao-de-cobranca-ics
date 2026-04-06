import { Titulo, Cliente, RegraCobranca, TemplateMensagem, MetricaUtilizacao, Empresa } from '../types';

export const mockEmpresas: Empresa[] = [
  { id: 'emp-1', nome: 'ICS Sistemas', cnpj: '11.111.111/0001-11', plano: 'Enterprise' },
  { id: 'emp-2', nome: 'Authen', cnpj: '22.222.222/0001-22', plano: 'Premium' },
  { id: 'emp-3', nome: 'Target', cnpj: '33.333.333/0001-33', plano: 'Standard' },
];

export const mockClientes: Cliente[] = [
  { id: '1', nome: 'Tech Solutions Ltda', email: 'financeiro@techsolutions.com', documento: '12.345.678/0001-90', telefone: '(11) 98765-4321' },
  { id: '2', nome: 'Padaria do João', email: 'joao@email.com', documento: '98.765.432/0001-10', telefone: '(11) 91234-5678' },
  { id: '3', nome: 'Inova Softwares', email: 'contato@inova.io', documento: '45.678.901/0001-22', telefone: '(11) 97777-8888' },
  { id: '4', nome: 'Mercado Central', email: 'financeiro@mercado.com', documento: '11.222.333/0001-44', telefone: '(11) 96666-5555' },
];

const mockHistorico: any[] = [
  { id: 'h1', data: '2024-03-10 14:30', canal: 'whatsapp', conteudo: 'Olá, lembramos que seu título NF-2024-001 vence em 5 dias.' },
  { id: 'h2', data: '2024-03-05 09:00', canal: 'email', conteudo: 'Prezado cliente, sua fatura está disponível para pagamento.' },
];

export const mockTitulos: Titulo[] = [
  { 
    id: '101', 
    empresaId: 'emp-1',
    clienteId: '1', 
    clienteNome: 'Tech Solutions Ltda', 
    numeroNF: 'NF-2024-001', 
    valor: 1500.00, 
    dataVencimento: '2024-03-15', 
    dataEmissao: '2024-02-15',
    status: 'pago', 
    dataPagamento: '2024-03-14',
    valorEmAberto: 0,
    valorPago: 1500.00,
    valorComDesconto: 1450.00,
    historicoDisparos: mockHistorico
  },
  { 
    id: '102', 
    empresaId: 'emp-1',
    clienteId: '2', 
    clienteNome: 'Padaria do João', 
    numeroNF: 'NF-2024-002', 
    valor: 450.50, 
    dataVencimento: '2024-03-10', 
    dataEmissao: '2024-02-10',
    status: 'vencido',
    valorEmAberto: 450.50,
    valorPago: 0,
    valorComDesconto: 0,
    historicoDisparos: [mockHistorico[0]]
  },
  { 
    id: '103', 
    empresaId: 'emp-2',
    clienteId: '3', 
    clienteNome: 'Inova Softwares', 
    numeroNF: 'NF-2024-003', 
    valor: 3200.00, 
    dataVencimento: '2024-03-20', 
    dataEmissao: '2024-02-20',
    status: 'pendente',
    valorEmAberto: 3200.00,
    valorPago: 0,
    valorComDesconto: 0,
    historicoDisparos: []
  },
  { 
    id: '104', 
    empresaId: 'emp-3',
    clienteId: '1', 
    clienteNome: 'Tech Solutions Ltda', 
    numeroNF: 'NF-2024-004', 
    valor: 1200.00, 
    dataVencimento: '2024-03-05', 
    dataEmissao: '2024-02-05',
    status: 'atrasado',
    valorEmAberto: 600.00,
    valorPago: 600.00,
    valorComDesconto: 0,
    historicoDisparos: mockHistorico
  },
];

export const mockRegras: RegraCobranca[] = [
  { id: 'r1', nome: 'Lembrete Pré-Vencimento', dias: -3, canal: 'whatsapp', templateId: 't1', ativa: true },
  { id: 'r2', nome: 'Aviso de Vencimento', dias: 0, canal: 'email', templateId: 't2', ativa: true },
  { id: 'r3', nome: 'Cobrança Atraso 5 dias', dias: 5, canal: 'whatsapp', templateId: 't3', ativa: true },
];

export const mockTemplates: TemplateMensagem[] = [
  { id: 't1', nome: 'Lembrete WhatsApp', canal: 'whatsapp', conteudo: 'Olá {cliente}, sua fatura de {valor} vence em {vencimento}. Segue link: {link_pagamento}' },
  { id: 't2', nome: 'E-mail Vencimento', canal: 'email', conteudo: 'Prezado {cliente}, informamos que seu título no valor de {valor} vence hoje.' },
  { id: 't3', nome: 'Cobrança Crítica', canal: 'whatsapp', conteudo: 'Atenção {cliente}, seu pagamento de {valor} está atrasado há 5 dias. Evite suspensão de serviços.' },
];

export const mockMetricas: MetricaUtilizacao[] = [
  { data: '01/03', whatsapp: 45, email: 120, sms: 10 },
  { data: '02/03', whatsapp: 52, email: 135, sms: 15 },
  { data: '03/03', whatsapp: 38, email: 110, sms: 8 },
  { data: '04/03', whatsapp: 65, email: 150, sms: 20 },
  { data: '05/03', whatsapp: 48, email: 125, sms: 12 },
  { data: '06/03', whatsapp: 70, email: 160, sms: 25 },
  { data: '07/03', whatsapp: 55, email: 140, sms: 18 },
];
