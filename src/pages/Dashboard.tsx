import { Card, Button } from '../components/ui/Base';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Calendar,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { useEffect, useState } from 'react';
import { dashboardService, titulosService } from '../services/api';
import { formatCurrency, cn } from '../utils/utils';
import { toast } from 'sonner';
import { useEmpresa } from '../contexts/EmpresaContext';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function Dashboard() {
  const { empresa } = useEmpresa();
  const [data, setData] = useState<any>(null);
  const [projecao, setProjecao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('2026-02-10');
  const [endDate, setEndDate] = useState('2026-03-12');

  const fetchStats = () => {
    setLoading(true);
    Promise.all([
      dashboardService.getStats({ startDate, endDate }),
      dashboardService.getProjecao(),
    ])
      .then(([statsRes, projecaoRes]) => {
        setData(statsRes.data);
        setProjecao(projecaoRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, [empresa.id]);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium italic">Carregando dados...</div>;
  }

  const { stats, evolution, distribution } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Bem-vindo de volta! Aqui está o resumo financeiro de hoje.</p>
        </div>
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <Button className="gap-2" onClick={() => setShowDatePicker(!showDatePicker)}>
              <Calendar className="w-4 h-4" /> Filtrar
            </Button>

            {showDatePicker && (
              <Card className="absolute right-0 top-full mt-2 p-4 z-50 w-64 shadow-xl border-slate-200 dark:border-[#2A364A] animate-in fade-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Data Inicial</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Data Final</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <Button className="w-full text-xs h-9" onClick={() => {
                    setShowDatePicker(false);
                    fetchStats();
                    toast.success('Filtro aplicado!');
                  }}>
                    Aplicar Filtro
                  </Button>
                  <Button variant="outline" className="w-full text-xs h-9" onClick={() => {
                    setStartDate('2026-02-10');
                    setEndDate('2026-03-12');
                    setShowDatePicker(false);
                    fetchStats();
                    toast.info('Filtros limpos');
                  }}>
                    Limpar Filtro
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total a Receber"
          value={formatCurrency(stats.total_receber || 0)}
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
        />
        <StatCard
          title="Títulos Pagos"
          value={formatCurrency(stats.total_pago || 0)}
          icon={CheckCircle2}
          trend="+8.2%"
          trendUp={true}
          color="emerald"
        />
        <StatCard
          title="Títulos Vencidos"
          value={formatCurrency(stats.total_vencido || 0)}
          icon={AlertCircle}
          trend="-2.4%"
          trendUp={false}
          color="amber"
        />
        <StatCard
          title="Em Atraso"
          value={formatCurrency(stats.total_atrasado || 0)}
          icon={Clock}
          trend="+4.1%"
          trendUp={false}
          color="red"
        />
      </div>

      {/* Cash Flow Projection */}
      {projecao && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" /> Projeção de Fluxo de Caixa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Valores esperados a receber nos próximos períodos</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Próximos 30 dias</p>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(projecao.proximos_30 || 0)}</p>
              <p className="text-[11px] text-indigo-500 mt-1">{projecao.qtd_30 || 0} título(s)</p>
            </div>
            <div className="p-5 rounded-xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Próximos 60 dias</p>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(projecao.proximos_60 || 0)}</p>
              <p className="text-[11px] text-amber-500 mt-1">{projecao.qtd_60 || 0} título(s)</p>
            </div>
            <div className="p-5 rounded-xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Próximos 90 dias</p>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(projecao.proximos_90 || 0)}</p>
              <p className="text-[11px] text-emerald-500 mt-1">{projecao.qtd_90 || 0} título(s)</p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Evolução de Cobrança</h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-slate-500 dark:text-slate-400">Valor</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="valor" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-6">Distribuição de Status</h3>
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              {distribution.map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">{item.name}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatCurrency(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'indigo' }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-lg", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-600")}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h2>
      </div>
    </Card>
  );
}
