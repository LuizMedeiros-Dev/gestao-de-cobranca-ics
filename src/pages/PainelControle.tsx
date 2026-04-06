import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/ui/Base';
import {
  Activity,
  RefreshCw,
  Mail,
  MessageCircle,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { titulosService, omieService, cobrancaManualService } from '../services/api';
import { formatDate } from '../utils/utils';
import { toast } from 'sonner';
import { useEmpresa } from '../contexts/EmpresaContext';

export default function PainelControle() {
  const { empresa } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [executandoRegras, setExecutandoRegras] = useState(false);
  const [provedores, setProvedores] = useState<any>(null);

  const fetchPanelData = () => {
    setLoading(true);
    Promise.all([
      titulosService.getPanelData(),
      cobrancaManualService.statusProvedores(),
    ])
      .then(([panelRes, provRes]) => {
        setData(panelRes.data);
        setProvedores(provRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSyncOmie = async () => {
    setSyncing(true);
    try {
      await omieService.syncEmpresa(empresa.id);
      toast.success(`Sincronização da empresa '${empresa.nome}' concluída!`);
      fetchPanelData();
    } catch (error: any) {
      toast.error('Erro ao sincronizar com OMIE: ' + (error?.response?.data?.error || error?.message || 'Erro desconhecido'));
    } finally {
      setSyncing(false);
    }
  };

  const handleExecutarRegras = async () => {
    setExecutandoRegras(true);
    try {
      const res = await cobrancaManualService.executarRegras();
      const disparos = res.data?.disparos ?? 0;
      toast.success(`Regras executadas! ${disparos} disparo(s) realizado(s).`);
      fetchPanelData();
    } catch (error: any) {
      toast.error('Erro ao executar regras: ' + (error?.response?.data?.error || error?.message));
    } finally {
      setExecutandoRegras(false);
    }
  };

  useEffect(() => {
    fetchPanelData();
  }, [empresa.id]);

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando painel...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Erro ao carregar dados.</div>;

  // Filter metrics: only WhatsApp, E-mails and Taxa de Entrega
  const allowedMetrics = ['WhatsApp Enviados', 'E-mails Enviados', 'Taxa de Entrega'];
  const filteredMetrics = (data.metrics as any[]).filter(m =>
    allowedMetrics.some(name => m.nome?.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
  );

  const metricIcons: Record<string, any> = {
    'WhatsApp Enviados': MessageCircle,
    'E-mails Enviados': Mail,
    'Taxa de Entrega': BarChart2,
  };

  const metricColors: Record<string, string> = {
    'WhatsApp Enviados': 'emerald',
    'E-mails Enviados': 'indigo',
    'Taxa de Entrega': 'amber',
  };

  const getMetricKey = (nome: string) => {
    return allowedMetrics.find(k => nome?.toLowerCase().includes(k.toLowerCase().split(' ')[0])) || nome;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel de Controle</h1>
          <p className="text-slate-500 dark:text-slate-400">Acompanhamento de envios, provedores e sincronização.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Execute Rules Button */}
          <button
            onClick={handleExecutarRegras}
            disabled={executandoRegras}
            className="
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm
              bg-amber-500 hover:bg-amber-600 active:bg-amber-700
              text-white shadow-lg shadow-amber-500/30
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            <Zap className={`w-4 h-4 ${executandoRegras ? 'animate-pulse' : ''}`} />
            {executandoRegras ? 'Executando...' : 'Executar Regras'}
          </button>

          {/* OMIE Sync Button */}
          <button
            onClick={handleSyncOmie}
            disabled={syncing}
            className="
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm
              bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
              text-white shadow-lg shadow-indigo-500/30
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar OMIE'}
          </button>
        </div>
      </div>

      {/* Provider Status */}
      {provedores && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-[#2A364A]">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-600" /> Status dos Provedores
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Provider */}
            <div className={`p-5 rounded-xl border flex items-center gap-4 ${provedores.email?.ok
                ? 'border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20'
              }`}>
              <div className={`p-3 rounded-xl ${provedores.email?.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">E-mail (SMTP)</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {provedores.email?.ok ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-600 font-medium">Conectado</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-xs text-red-600 font-medium">{provedores.email?.motivo || 'Desconectado'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* WhatsApp Provider */}
            <div className={`p-5 rounded-xl border flex items-center gap-4 ${provedores.whatsapp?.ok
                ? 'border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20'
              }`}>
              <div className={`p-3 rounded-xl ${provedores.whatsapp?.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">WhatsApp (Evolution API)</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {provedores.whatsapp?.ok ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-600 font-medium">Conectado — {provedores.whatsapp?.estado}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-xs text-red-600 font-medium">{provedores.whatsapp?.motivo || 'Desconectado'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics Grid */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-[#2A364A]">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Métricas de Envios
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredMetrics.map((metric: any) => {
              const key = getMetricKey(metric.nome);
              const Icon = metricIcons[key] || BarChart2;
              const color = metricColors[key] || 'indigo';
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800/40',
                indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800/40',
                amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800/40',
              };
              return (
                <div key={metric.id} className={`p-5 rounded-xl border ${colorMap[color]} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">{metric.nome}</p>
                    <Icon className="w-5 h-5 opacity-70" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{metric.valor}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Última atualização: {formatDate(metric.ultima_atualizacao)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Last Sync Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Sincronização Automática com OMIE</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Os dados são sincronizados automaticamente a cada 30 minutos. As regras de cobrança são executadas todo dia às 8h.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
