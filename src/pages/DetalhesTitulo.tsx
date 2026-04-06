import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, Button, Badge } from '../components/ui/Base';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  CreditCard, 
  History,
  Smartphone,
  Mail
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/utils';
import { titulosService } from '../services/api';

export default function DetalhesTitulo({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    titulosService.getTituloById(params.id)
      .then(res => {
        setTitulo(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando detalhes do título...</div>;
  }

  if (!titulo) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Título não encontrado</h2>
        <Button onClick={() => setLocation('/titulos')} className="mt-4">Voltar para Títulos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/titulos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Detalhes da Nota Fiscal</h1>
          <p className="text-slate-500 dark:text-slate-400">{titulo.numero_documento} • {titulo.cliente}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Informações Gerais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <DetailItem label="Número do Documento" value={titulo.numero_documento} />
              <DetailItem label="Status" value={<StatusBadge status={titulo.status_calculado || titulo.status_titulo} />} />
              <DetailItem label="Data de Emissão" value={formatDate(titulo.data_previsao)} />
              <DetailItem label="Data de Vencimento" value={formatDate(titulo.data_vencimento)} />
              <DetailItem label="Data de Recebimento" value={titulo.data_pagamento ? formatDate(titulo.data_pagamento) : 'Pendente'} />
              <DetailItem label="Valor Total" value={formatCurrency(titulo.valor_documento)} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Histórico de Disparos
            </h3>
            <div className="space-y-4">
              {titulo.historico && titulo.historico.length > 0 ? (
                titulo.historico.map((disparo: any, index: number) => (
                  <div key={index} className="p-4 rounded-xl border border-slate-100 dark:border-[#2A364A] bg-slate-50 dark:bg-[#121826]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {disparo.canal === 'whatsapp' ? (
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Mail className="w-4 h-4 text-indigo-600" />
                        )}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{disparo.canal}</span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{formatDate(disparo.data)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{disparo.conteudo}"</p>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Nenhum disparo registrado para este título.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Dados do Cliente
            </h3>
            <div className="space-y-4">
              <DetailItem label="Nome" value={titulo.cliente} />
              <DetailItem label="ID Cliente" value={titulo.cliente_id} />
              <DetailItem label="ID Título" value={titulo.id} />
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 text-white border-none">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Resumo Financeiro
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 dark:text-slate-500 text-sm">Valor Pago</span>
                <span className="font-bold text-emerald-400">{formatCurrency(titulo.valor_pago || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 dark:text-slate-500 text-sm">Valor em Aberto</span>
                <span className="font-bold text-red-400">{formatCurrency(titulo.valor_documento - (titulo.valor_pago || 0))}</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-white font-bold">Total</span>
                <span className="text-xl font-bold">{formatCurrency(titulo.valor_documento)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm font-medium text-slate-900 dark:text-white">{value || '-'}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || '';
  if (s.includes('PAGO')) return <Badge variant="success">Pago</Badge>;
  if (s.includes('A VENCER') || s.includes('PENDENTE')) return <Badge variant="info">A Vencer</Badge>;
  if (s.includes('VENCE HOJE')) return <Badge variant="warning">Vence Hoje</Badge>;
  if (s.includes('ATRASADO') || s.includes('VENCIDO')) return <Badge variant="error">Atrasado</Badge>;
  return <Badge>{status}</Badge>;
}
