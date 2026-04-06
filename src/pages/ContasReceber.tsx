import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Base';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users,
  Calendar,
  RefreshCw,
  Printer,
  ChevronDown,
  CheckCircle2,
  TrendingDown,
  Info
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { formatCurrency, cn } from '../utils/utils';
import { titulosService, contasReceberService } from '../services/api';
import { useEmpresa } from '../contexts/EmpresaContext';

export default function ContasReceber() {
  const { empresa } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [riskClients, setRiskClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientForTitles, setSelectedClientForTitles] = useState<any>(null);
  const [showTitlesListModal, setShowTitlesListModal] = useState(false);

  const fetchRiskClients = (nivel: string) => {
    setLoadingClients(true);
    contasReceberService.getRiskClients(nivel)
      .then(res => {
        setRiskClients(res.data);
        setLoadingClients(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingClients(false);
      });
  };

  const fetchData = () => {
    setLoading(true);
    contasReceberService.getSummary({ startDate, endDate })
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [empresa.id]);

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium italic">Carregando análise financeira...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Erro ao carregar dados.</div>;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contas a Receber</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe e analise todas as suas contas a receber</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 !overflow-visible">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Data Inicial</label>
            <div className="relative group">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                onClick={(e) => (e.target as any).showPicker?.()}
              />
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Data Final</label>
            <div className="relative group">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                onClick={(e) => (e.target as any).showPicker?.()}
              />
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-2.5 pointer-events-none group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
          
          <button 
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </Card>

      {/* Row 1: Resumo and Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo de Contas */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-[#2A364A]">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Resumo de Contas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#121826] border-b border-slate-100 dark:border-[#2A364A]">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Quantidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Valor Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Percentual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.resumoContas.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-50 dark:bg-[#121826] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.categoria}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-right font-medium">
                      {item.quantidade.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">
                      {item.percentual}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Distribuição Chart */}
        <Card className="p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Distribuição</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.resumoContas.filter((i: any) => i.categoria !== 'Títulos Totais')}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="percentual"
                  label={({ percentual }) => `${percentual}%`}
                >
                  {data.resumoContas.filter((i: any) => i.categoria !== 'Títulos Totais').map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {data.resumoContas.filter((i: any) => i.categoria !== 'Títulos Totais').map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.categoria}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Análise and Risco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Análise Financeira */}
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Análise Financeira</h3>
          <div className="space-y-4">
            <AnalysisCard 
              label="Valor Total" 
              value={formatCurrency(data.analiseFinanceira.valorTotal)} 
              icon={TrendingUp}
              color="blue"
            />
            <AnalysisCard 
              label="Ticket Médio" 
              value={formatCurrency(data.analiseFinanceira.ticketMedio)} 
              icon={TrendingUp}
              color="purple"
            />
            <AnalysisCard 
              label="Taxa de Recebimento" 
              value={`${data.analiseFinanceira.taxaRecebimento}%`} 
              icon={CheckCircle2}
              color="emerald"
            />
          </div>
        </Card>

        {/* Risco de Clientes */}
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Risco de Clientes</h3>
          <div className="space-y-4">
            {data.riscoClientes.map((risco: any, index: number) => (
              <RiskCard 
                key={index}
                nivel={risco.nivel}
                percentual={risco.percentual}
                detalhe={risco.detalhe}
                quantidade={risco.quantidade}
                color={risco.color}
                onClick={() => {
                  setSelectedRisk(risco);
                  fetchRiskClients(risco.nivel);
                  setShowRiskModal(true);
                }}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Risk Details Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E2738] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-[#2A364A] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRisk?.nivel}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRisk?.detalhe}</p>
              </div>
              <button 
                onClick={() => setShowRiskModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
              >
                <ChevronDown className="w-6 h-6 rotate-90" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {loadingClients ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 italic">Carregando clientes...</div>
              ) : (
                <div className="space-y-3">
                  {riskClients.map((client) => (
                    <div key={client.id} className="p-4 bg-slate-50 dark:bg-[#121826] rounded-xl border border-slate-100 dark:border-[#2A364A] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{client.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Vencimento: {client.vencimento}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">{formatCurrency(client.valor_total_vencido)}</p>
                        <button 
                          onClick={() => {
                            setSelectedClientForTitles(client);
                            setShowTitlesListModal(true);
                          }}
                          className="text-[10px] font-bold text-indigo-500 uppercase hover:underline"
                        >
                          {selectedRisk?.nivel === 'Baixo Risco' ? 'Ver Título' : 'Ver Títulos'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-[#2A364A] bg-slate-50 dark:bg-[#121826] shrink-0 flex justify-end">
              <button 
                onClick={() => setShowRiskModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Titles List Modal */}
      {showTitlesListModal && selectedClientForTitles && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E2738] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-[#2A364A] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Títulos em Atraso</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedClientForTitles.nome_fantasia}</p>
              </div>
              <button 
                onClick={() => setShowTitlesListModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3">
                {selectedClientForTitles.titles.map((title: any) => (
                  <div key={title.id} className="p-4 bg-slate-50 dark:bg-[#121826] rounded-xl border border-slate-100 dark:border-[#2A364A] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{title.numero_documento}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Vencimento: {title.data_vencimento}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(title.valor_documento)}</p>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                        Vencido
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-[#2A364A] bg-slate-50 dark:bg-[#121826] shrink-0 flex justify-end">
              <button 
                onClick={() => setShowTitlesListModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  };

  return (
    <div className={cn("p-4 rounded-xl border flex items-center justify-between", colors[color])}>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase opacity-70">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
      <Icon className="w-6 h-6 opacity-80" />
    </div>
  );
}

function RiskCard({ nivel, percentual, detalhe, quantidade, color, onClick }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 icon-emerald-600 hover:bg-emerald-100',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 icon-amber-600 hover:bg-amber-100',
    red: 'bg-red-50 border-red-100 text-red-700 icon-red-600 hover:bg-red-100',
  };

  const icons: any = {
    emerald: CheckCircle2,
    amber: Info,
    red: AlertTriangle,
  };

  const Icon = icons[color];

  return (
    <div 
      className={cn("p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all active:scale-[0.98]", colors[color])}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-bold">{nivel}</span>
        </div>
        <span className="text-xs font-bold opacity-60">{percentual}%</span>
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium opacity-60">{detalhe}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{quantidade} clientes</p>
      </div>
    </div>
  );
}
