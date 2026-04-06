import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/ui/Base';
import {
  Search, Users, FileText, ChevronDown, Download,
  Mail, Smartphone, Clock, AlertCircle, CheckCircle2,
  X, Eye, Edit3, Save
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../utils/utils';
import { toast } from 'sonner';
import { useEmpresa } from '../contexts/EmpresaContext';
import api, { clientesService } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

function getStatusColor(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'PAGO') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (s === 'ATRASADO') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (s === 'VENCE HOJE') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
}

function formatarTelefone(t: string) {
  if (!t) return '—';
  return t;
}

export default function Clientes() {
  const { empresa } = useEmpresa();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [abaModal, setAbaModal] = useState<'titulos' | 'historico'>('titulos');
  const [editandoContato, setEditandoContato] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [salvandoContato, setSalvandoContato] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clientes', { params: search ? { search } : {} });
      setClientes(res.data);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [empresa.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClientes();
  };

  const verDetalhe = async (cliente: any) => {
    setClienteSelecionado(null);
    setLoadingDetalhe(true);
    setAbaModal('titulos');
    setEditandoContato(false);
    try {
      const res = await api.get(`/clientes/${cliente.id}`);
      setClienteSelecionado(res.data);
      setEditEmail(res.data.email || '');
      setEditTelefone(res.data.telefone || '');
    } catch {
      toast.error('Erro ao carregar detalhes do cliente');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const handleSalvarContato = async () => {
    if (!clienteSelecionado) return;
    setSalvandoContato(true);
    try {
      await clientesService.updateCliente(clienteSelecionado.id, { email: editEmail, telefone: editTelefone });
      toast.success('Contato atualizado com sucesso!');
      setClienteSelecionado({ ...clienteSelecionado, email: editEmail, telefone: editTelefone });
      setEditandoContato(false);
      fetchClientes(); // Atualiza a lista
    } catch (err: any) {
      toast.error('Erro ao salvar contato: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSalvandoContato(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-500" />
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie seus clientes, histórico de contatos e inadimplência
          </p>
        </div>

      </div>

      {/* Busca */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden p-0">
        <div className="p-5 border-b border-slate-100 dark:border-[#2A364A] flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 italic">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-[#121826] border-b border-slate-100 dark:border-[#2A364A]">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cliente</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Contato</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Títulos</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Em Aberto</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Último Disparo</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2A364A]">
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50 dark:hover:bg-[#1E2738]/40 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{cliente.nome_fantasia || cliente.razao_social}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{cliente.cnpj_cpf || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {cliente.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[160px]">{cliente.email}</span>
                          </div>
                        )}
                        {cliente.telefone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Smartphone className="w-3 h-3" />
                            <span>{formatarTelefone(cliente.telefone)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{cliente.total_titulos}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={cn(
                        'text-sm font-bold',
                        parseFloat(cliente.total_em_aberto) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {formatCurrency(cliente.total_em_aberto)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {cliente.ultimo_disparo ? (
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(cliente.ultimo_disparo).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => verDetalhe(cliente)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {(clienteSelecionado || loadingDetalhe) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setClienteSelecionado(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-[#1E2738] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {loadingDetalhe ? (
                <div className="p-12 text-center text-slate-400 italic">Carregando...</div>
              ) : clienteSelecionado && (
                <>
                  {/* Header do modal */}
                  <div className="p-6 border-b border-slate-100 dark:border-[#2A364A] flex items-start justify-between gap-4 shrink-0">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                        {clienteSelecionado.nome_fantasia || clienteSelecionado.razao_social}
                      </h2>
                      {editandoContato ? (
                        <div className="flex flex-wrap gap-3 mt-3">
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              placeholder="email@exemplo.com"
                              className="bg-transparent text-sm outline-none w-48 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg px-3 py-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={editTelefone}
                              onChange={e => setEditTelefone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="bg-transparent text-sm outline-none w-40 text-slate-800 dark:text-slate-200"
                            />
                          </div>
                          <button
                            onClick={handleSalvarContato}
                            disabled={salvandoContato}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {salvandoContato ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => setEditandoContato(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {clienteSelecionado.cnpj_cpf && <span>CNPJ/CPF: {clienteSelecionado.cnpj_cpf}</span>}
                          {clienteSelecionado.email && (
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{clienteSelecionado.email}</span>
                          )}
                          {clienteSelecionado.telefone && (
                            <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" />{clienteSelecionado.telefone}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!editandoContato && (
                        <button
                          onClick={() => {
                            setEditEmail(clienteSelecionado.email || '');
                            setEditTelefone(clienteSelecionado.telefone || '');
                            setEditandoContato(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar Contato
                        </button>
                      )}

                      <button
                        onClick={() => setClienteSelecionado(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Abas */}
                  <div className="flex border-b border-slate-100 dark:border-[#2A364A] px-6 shrink-0">
                    {(['titulos', 'historico'] as const).map(aba => (
                      <button
                        key={aba}
                        onClick={() => setAbaModal(aba)}
                        className={cn(
                          'px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors capitalize',
                          abaModal === aba
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        )}
                      >
                        {aba === 'titulos' ? `Títulos (${clienteSelecionado.titulos?.length || 0})` : `Histórico de Disparos (${clienteSelecionado.disparos?.length || 0})`}
                      </button>
                    ))}
                  </div>

                  {/* Conteúdo */}
                  <div className="overflow-y-auto flex-1">
                    {abaModal === 'titulos' && (
                      <div className="p-0">
                        {clienteSelecionado.titulos?.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 italic">Nenhum título encontrado</div>
                        ) : (
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-[#121826] sticky top-0">
                              <tr>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">NF</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-center">Vencimento</th>
                                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#2A364A]">
                              {clienteSelecionado.titulos?.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#1E2738]/40 transition-colors">
                                  <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-200 font-medium">{t.numero_documento || '—'}</td>
                                  <td className="px-5 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 text-right">{formatCurrency(t.valor_documento)}</td>
                                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 text-center">{formatDate(t.data_vencimento)}</td>
                                  <td className="px-5 py-3 text-center">
                                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', getStatusColor(t.status_calculado))}>
                                      {t.status_calculado}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {abaModal === 'historico' && (
                      <div className="p-5 space-y-3">
                        {clienteSelecionado.disparos?.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 italic">Nenhum disparo registrado</div>
                        ) : (
                          clienteSelecionado.disparos?.map((d: any) => (
                            <div key={d.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#121826] border border-slate-100 dark:border-[#2A364A]">
                              <div className={cn('mt-0.5 p-1.5 rounded-lg', d.status === 'ENVIADO' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                                {d.status === 'ENVIADO'
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  : <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{d.tipo_envio}</span>
                                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', d.status === 'ENVIADO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                                    {d.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.detalhes || '—'}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                  {new Date(d.data_envio).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
