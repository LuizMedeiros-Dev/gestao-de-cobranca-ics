import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/ui/Base';
import { Modal } from '../components/ui/Modal';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Handshake,
  History,
  Download,
  Plus,
  Smartphone,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit,
  Trash2,
  Send
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../utils/utils';
import { toast } from 'sonner';
import { useLocation, Link } from 'wouter';
import { titulosService, cobrancaManualService } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { useEmpresa } from '../contexts/EmpresaContext';

export default function Titulos() {
  const [, setLocation] = useLocation();
  const { empresa } = useEmpresa();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [titulos, setTitulos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedTitulo, setSelectedTitulo] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showAgreementsListModal, setShowAgreementsListModal] = useState(false);
  const [showNewTituloModal, setShowNewTituloModal] = useState(false);
  const [showEditTituloModal, setShowEditTituloModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agreementTab, setAgreementTab] = useState<'dados' | 'mensagens'>('dados');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [acordos, setAcordos] = useState<any[]>([]);
  const [editingAcordoId, setEditingAcordoId] = useState<number | null>(null);
  const [showAcordoContextMenu, setShowAcordoContextMenu] = useState<{ id: number, x: number, y: number } | null>(null);
  const [showDeleteAcordoConfirm, setShowDeleteAcordoConfirm] = useState<number | null>(null);
  const [sortField, setSortField] = useState<'vencimento' | 'valor' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Histórico, Cobrança Manual e Pagamento
  const [historicoItems, setHistoricoItems] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [showCobrarModal, setShowCobrarModal] = useState(false);
  const [cobrarCanal, setCobrarCanal] = useState<'email' | 'whatsapp'>('email');
  const [cobrarMensagem, setCobrarMensagem] = useState('');
  const [enviandoCobranca, setEnviandoCobranca] = useState(false);

  const [newTitulo, setNewTitulo] = useState({
    cliente: '',
    numero_documento: '',
    valor_documento: '',
    data_vencimento: '',
    data_emissao: new Date().toISOString().split('T')[0],
    status_titulo: 'Pendente'
  });

  const [newAcordo, setNewAcordo] = useState({
    descricao: '',
    data_primeira_parcela: '',
    numero_parcelas: 1,
    valor_parcela: '',
    observacoes: '',
    mensagem_email: '',
    mensagem_whatsapp: ''
  });

  const fetchTitulos = () => {
    setLoading(true);
    const statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'all';
    titulosService.getTitulos({ status: statusParam, search: searchTerm })
      .then(res => {
        setTitulos(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleSort = (field: 'vencimento' | 'valor') => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortField(null);
      setSortOrder(null);
    }
  };

  // Otimização: Memoization da ordenação para evitar recálculos desnecessários a cada renderização da tabela
  const sortedTitulos = React.useMemo(() => {
    if (!sortField || !sortOrder) return titulos;
    return [...titulos].sort((a, b) => {
      if (sortField === 'vencimento') {
        const dateA = new Date(a.data_vencimento).getTime();
        const dateB = new Date(b.data_vencimento).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const valA = parseFloat(a.valor_documento) || 0;
        const valB = parseFloat(b.valor_documento) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [titulos, sortField, sortOrder]);

  useEffect(() => {
    fetchTitulos();
    fetch('/api/templates').then(res => res.json()).then(setTemplates);
  }, [selectedStatuses, searchTerm, empresa.id]);

  const fetchAcordos = (tituloId: number) => {
    titulosService.getAcordos(tituloId)
      .then(res => {
        if (Array.isArray(res.data)) {
          setAcordos(res.data);
        } else {
          setAcordos([]);
        }
      })
      .catch(err => {
        console.error('Erro ao buscar acordos:', err);
        setAcordos([]);
      });
  };

  const handleCreateAgreement = () => {
    if (!selectedTitulo) return;

    const valorParcelaNum = typeof newAcordo.valor_parcela === 'string'
      ? parseFloat(newAcordo.valor_parcela.replace(/[^\d,.-]/g, '').replace(',', '.'))
      : newAcordo.valor_parcela;

    const valorTotal = valorParcelaNum * newAcordo.numero_parcelas;
    const payload = {
      ...newAcordo,
      valor_total: valorTotal,
      valor_parcela: valorParcelaNum
    };

    const action = editingAcordoId
      ? titulosService.updateAcordo(editingAcordoId, payload)
      : titulosService.createAcordo(selectedTitulo.id, payload);

    action
      .then(() => {
        toast.success(editingAcordoId ? 'Acordo atualizado!' : 'Acordo criado com sucesso!');
        setShowAgreementModal(false);
        setEditingAcordoId(null);
        fetchAcordos(selectedTitulo.id);
        setShowAgreementsListModal(true);
      })
      .catch(err => toast.error('Erro ao processar acordo: ' + err.message));
  };

  const handleDeleteAcordo = (id: number) => {
    titulosService.deleteAcordo(id)
      .then(() => {
        toast.success('Acordo excluído!');
        setShowDeleteAcordoConfirm(null);
        if (selectedTitulo) fetchAcordos(selectedTitulo.id);
      })
      .catch(err => toast.error('Erro ao excluir: ' + err.message));
  };

  const handleEditAcordo = (acordo: any) => {
    setEditingAcordoId(acordo.id);
    setNewAcordo({
      descricao: acordo.descricao,
      data_primeira_parcela: acordo.data_primeira_parcela,
      numero_parcelas: acordo.numero_parcelas,
      valor_parcela: acordo.valor_parcela.toString(),
      observacoes: acordo.observacoes || '',
      mensagem_email: acordo.mensagem_email || '',
      mensagem_whatsapp: acordo.mensagem_whatsapp || ''
    });
    setShowAgreementsListModal(false);
    setShowAgreementModal(true);
  };

  const handleCreateTitulo = (e: React.FormEvent) => {
    e.preventDefault();
    titulosService.createTitulo(newTitulo)
      .then(() => {
        toast.success('Título criado com sucesso!');
        setShowNewTituloModal(false);
        setNewTitulo({
          cliente: '',
          numero_documento: '',
          valor_documento: '',
          data_vencimento: '',
          data_emissao: new Date().toISOString().split('T')[0],
          status_titulo: 'Pendente'
        });
        fetchTitulos();
      })
      .catch(err => toast.error('Erro ao criar título: ' + err.message));
  };

  const handleEditTitulo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitulo) return;

    fetch(`/api/titulos/${selectedTitulo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTitulo)
    })
      .then(res => res.json())
      .then(() => {
        toast.success('Título atualizado com sucesso!');
        setShowEditTituloModal(false);
        fetchTitulos();
      })
      .catch(err => toast.error('Erro ao atualizar título: ' + err.message));
  };

  const handleDeleteTitulo = () => {
    if (!selectedTitulo) return;

    fetch(`/api/titulos/${selectedTitulo.id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(() => {
        toast.success('Título excluído com sucesso!');
        setShowDeleteModal(false);
        fetchTitulos();
      })
      .catch(err => toast.error('Erro ao excluir título: ' + err.message));
  };

  const handleExportCSV = () => {
    if (titulos.length === 0) {
      toast.error('Não há dados para exportar.');
      return;
    }

    const headers = ['Cliente', 'NF', 'Valor', 'Vencimento', 'Status'];
    const rows = titulos.map(t => [
      t.cliente,
      t.numero_documento,
      t.valor_documento,
      t.data_vencimento,
      t.status_titulo
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finflow-titulos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exportado com sucesso!');
  };


  const fetchHistorico = async (tituloId: number) => {
    setLoadingHistorico(true);
    try {
      const res = await cobrancaManualService.getHistorico(tituloId);
      setHistoricoItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistoricoItems([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleCobrar = async () => {
    if (!selectedTitulo || !cobrarMensagem.trim()) {
      toast.error('Preencha a mensagem de cobrança.');
      return;
    }
    setEnviandoCobranca(true);
    try {
      const res = await cobrancaManualService.cobrarTitulo(selectedTitulo.id, cobrarCanal, cobrarMensagem);
      toast.success(`Cobrança enviada via ${cobrarCanal} para ${res.data.destinatario}!`);
      setShowCobrarModal(false);
      setCobrarMensagem('');
    } catch (err: any) {
      toast.error('Erro ao enviar cobrança: ' + (err?.response?.data?.error || err?.message));
    } finally {
      setEnviandoCobranca(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Títulos</h1>
          <p className="text-slate-500 dark:text-slate-400">Visualize e gerencie todos os títulos emitidos.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="w-4 h-4" /> CSV
          </Button>

        </div>
      </div>

      <Card className="p-4 !overflow-visible relative z-10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cliente ou NF..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 relative">
            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
            >
              <span className="text-slate-600 dark:text-slate-300">
                {selectedStatuses.length === 0 ? 'Todos os Status' : `${selectedStatuses.length} selecionado(s)`}
              </span>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform", showStatusDropdown && "rotate-180")} />
            </button>

            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                <Card className="absolute top-full left-0 mt-2 w-full z-50 p-2 shadow-xl border-slate-100 dark:border-[#2A364A] bg-white dark:bg-[#1E2738]">
                  <div className="space-y-1">
                    {['A VENCER', 'VENCE HOJE', 'ATRASADO', 'PAGO'].map(status => (
                      <label key={status} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:bg-[#121826] rounded cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedStatuses.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStatuses([...selectedStatuses, status]);
                            } else {
                              setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{status}</span>
                      </label>
                    ))}
                  </div>
                  {selectedStatuses.length > 0 && (
                    <button
                      onClick={() => setSelectedStatuses([])}
                      className="w-full mt-2 pt-2 border-t border-slate-100 dark:border-[#2A364A] text-[10px] font-bold text-indigo-600 uppercase hover:text-indigo-700"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando títulos...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#121826] border-b border-slate-100 dark:border-[#2A364A]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NF</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('valor')}
                      className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                    >
                      Valor
                      <span className={cn("transition-colors", sortField === 'valor' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-300 dark:text-slate-600 group-hover:text-indigo-400")}>
                        {sortField === 'valor' && sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : sortField === 'valor' && sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('vencimento')}
                      className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                    >
                      Vencimento
                      <span className={cn("transition-colors", sortField === 'vencimento' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-300 dark:text-slate-600 group-hover:text-indigo-400")}>
                        {sortField === 'vencimento' && sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : sortField === 'vencimento' && sortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTitulos.map((titulo, index, array) => {
                  const isBottom = index >= array.length - 4 && array.length > 4;
                  return (
                  <tr key={titulo.id} className="hover:bg-slate-50 dark:bg-[#121826] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{titulo.cliente}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">ID: {titulo.cliente_id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/titulos/${titulo.id}`}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        {titulo.numero_documento}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(titulo.valor_documento)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(titulo.data_vencimento)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={titulo.status_calculado || titulo.status_titulo} />
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setActiveActionMenu(activeActionMenu === titulo.id ? null : titulo.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeActionMenu === titulo.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveActionMenu(null)}
                          />
                          <div className={cn(
                            "absolute right-10 w-48 bg-white dark:bg-[#1E2738] border border-slate-100 dark:border-[#2A364A] shadow-xl rounded-xl p-1 z-20 text-left",
                            isBottom ? "bottom-2" : "top-12"
                          )}>
                            <ActionMenuItem
                              icon={Eye}
                              label="Visualizar detalhes"
                              onClick={() => {
                                setLocation(`/titulos/${titulo.id}`);
                                setActiveActionMenu(null);
                              }}
                            />
                            <ActionMenuItem
                              icon={History}
                              label="Histórico de Disparos"
                              onClick={() => {
                                setSelectedTitulo(titulo);
                                fetchHistorico(titulo.id);
                                setShowHistoryModal(true);
                                setActiveActionMenu(null);
                              }}
                            />
                            <ActionMenuItem
                              icon={Handshake}
                              label="Acordos"
                              onClick={() => {
                                setSelectedTitulo(titulo);
                                fetchAcordos(titulo.id);
                                setShowAgreementsListModal(true);
                                setActiveActionMenu(null);
                              }}
                            />
                            {(titulo.status_calculado || titulo.status_titulo)?.toUpperCase() !== 'PAGO' && (
                              <>
                                <ActionMenuItem
                                  icon={Send}
                                  label="Enviar Cobrança"
                                  onClick={() => {
                                    setSelectedTitulo(titulo);
                                    setCobrarCanal('email');
                                    setCobrarMensagem('');
                                    setShowCobrarModal(true);
                                    setActiveActionMenu(null);
                                  }}
                                />

                              </>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Histórico de Disparos — ${selectedTitulo?.numero_documento}`}
        size="lg"
      >
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
          {loadingHistorico ? (
            <p className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">Carregando histórico...</p>
          ) : historicoItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-[#121826] rounded-xl border border-dashed border-slate-200 dark:border-[#2A364A]">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum disparo registrado para este título.</p>
            </div>
          ) : (
            historicoItems.map((disparo: any) => (
              <HistoryItem key={disparo.id} disparo={disparo} />
            ))
          )}
        </div>
      </Modal>

      {/* Cobrar Modal */}
      <Modal
        isOpen={showCobrarModal}
        onClose={() => setShowCobrarModal(false)}
        title={`Enviar Cobrança — ${selectedTitulo?.numero_documento}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex gap-3">
            <button
              onClick={() => setCobrarCanal('email')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                cobrarCanal === 'email'
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                  : "border-slate-200 dark:border-[#2A364A] text-slate-500 dark:text-slate-400 hover:border-indigo-300"
              )}
            >
              <Mail className="w-4 h-4" /> E-mail
            </button>
            <button
              onClick={() => setCobrarCanal('whatsapp')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                cobrarCanal === 'whatsapp'
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "border-slate-200 dark:border-[#2A364A] text-slate-500 dark:text-slate-400 hover:border-emerald-300"
              )}
            >
              <Smartphone className="w-4 h-4" /> WhatsApp
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Selecionar Template</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => {
                const template = templates.find(t => t.id === parseInt(e.target.value));
                if (template) setCobrarMensagem(template.conteudo);
              }}
            >
              <option value="">Selecione um template...</option>
              {templates.filter(t => (t.tipo || t.canal) === cobrarCanal).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Mensagem</label>
            <textarea
              rows={5}
              placeholder={`Mensagem de ${cobrarCanal === 'email' ? 'e-mail' : 'WhatsApp'}...`}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              value={cobrarMensagem}
              onChange={(e) => setCobrarMensagem(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2A364A]">
            <Button variant="outline" onClick={() => setShowCobrarModal(false)}>Cancelar</Button>
            <Button onClick={handleCobrar} disabled={enviandoCobranca}>
              {enviandoCobranca ? 'Enviando...' : `Enviar via ${cobrarCanal === 'email' ? 'E-mail' : 'WhatsApp'}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Agreements List Modal */}
      <Modal
        isOpen={showAgreementsListModal}
        onClose={() => setShowAgreementsListModal(false)}
        title={`Acordos - ${selectedTitulo?.numero_documento}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Acordos Registrados</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingAcordoId(null);
                setNewAcordo({
                  descricao: '',
                  data_primeira_parcela: '',
                  numero_parcelas: 1,
                  valor_parcela: '',
                  observacoes: '',
                  mensagem_email: '',
                  mensagem_whatsapp: ''
                });
                setShowAgreementsListModal(false);
                setShowAgreementModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar Novo Acordo
            </Button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 relative">
            {acordos.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-[#121826] rounded-xl border border-dashed border-slate-200 dark:border-[#2A364A]">
                <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum acordo encontrado para este título.</p>
              </div>
            ) : (
              acordos.map((acordo: any) => (
                <div
                  key={acordo.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowAcordoContextMenu({ id: acordo.id, x: e.clientX, y: e.clientY });
                  }}
                  className="p-4 bg-white dark:bg-[#1E2738] border border-slate-100 dark:border-[#2A364A] rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-default relative group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Handshake className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{acordo.descricao}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(acordo.data_acordo)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={acordo.status === 'Ativo' ? 'success' : 'info'}>{acordo.status}</Badge>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={() => handleEditAcordo(acordo)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 dark:text-slate-500 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteAcordoConfirm(acordo.id)}
                          className="p-1 hover:bg-red-50 rounded text-slate-400 dark:text-slate-500 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Parcelas</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{acordo.numero_parcelas}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Valor Parcela</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(acordo.valor_parcela)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">1º Vencimento</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDate(acordo.data_primeira_parcela)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total</p>
                      <p className="text-sm font-bold text-indigo-600">{formatCurrency(acordo.valor_total)}</p>
                    </div>
                  </div>

                  {/* Context Menu */}
                  {showAcordoContextMenu?.id === acordo.id && (
                    <div
                      className="fixed bg-white dark:bg-[#1E2738] border border-slate-100 dark:border-[#2A364A] shadow-xl rounded-lg py-1 z-[100] min-w-[120px]"
                      style={{ left: showAcordoContextMenu.x, top: showAcordoContextMenu.y }}
                      onMouseLeave={() => setShowAcordoContextMenu(null)}
                    >
                      <button
                        onClick={() => {
                          handleEditAcordo(acordo);
                          setShowAcordoContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:bg-[#121826] flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteAcordoConfirm(acordo.id);
                          setShowAcordoContextMenu(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Agreement Confirmation Modal */}
      <Modal
        isOpen={showDeleteAcordoConfirm !== null}
        onClose={() => setShowDeleteAcordoConfirm(null)}
        title="Confirmar Exclusão de Acordo"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900 text-sm">Atenção!</p>
              <p className="text-red-700 text-xs">Esta ação não pode ser desfeita. Deseja realmente excluir este acordo de pagamento?</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteAcordoConfirm(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => showDeleteAcordoConfirm && handleDeleteAcordo(showDeleteAcordoConfirm)}
            >
              Excluir Acordo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Agreement Modal */}
      <Modal
        isOpen={showAgreementModal}
        onClose={() => {
          setShowAgreementModal(false);
          setEditingAcordoId(null);
        }}
        title={editingAcordoId ? "Editar Acordo de Pagamento" : "Criar Acordo de Pagamento"}
        size="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex border-b border-slate-100 dark:border-[#2A364A] mb-6 shrink-0">
            <button
              onClick={() => setAgreementTab('dados')}
              className={cn(
                "px-6 py-3 text-sm font-bold transition-colors border-b-2",
                agreementTab === 'dados' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
              )}
            >
              Dados do Acordo
            </button>
            <button
              onClick={() => setAgreementTab('mensagens')}
              className={cn(
                "px-6 py-3 text-sm font-bold transition-colors border-b-2",
                agreementTab === 'mensagens' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
              )}
            >
              Mensagens de Cobrança
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {agreementTab === 'dados' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Descrição do Acordo</label>
                  <input
                    type="text"
                    placeholder="Ex: Parcelamento de dívida vencida"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newAcordo.descricao}
                    onChange={(e) => setNewAcordo({ ...newAcordo, descricao: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Data da Primeira Parcela</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newAcordo.data_primeira_parcela}
                    onChange={(e) => setNewAcordo({ ...newAcordo, data_primeira_parcela: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Número de Parcelas</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newAcordo.numero_parcelas}
                    onChange={(e) => setNewAcordo({ ...newAcordo, numero_parcelas: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor da Parcela</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newAcordo.valor_parcela}
                    onChange={(e) => setNewAcordo({ ...newAcordo, valor_parcela: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Observações</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    value={newAcordo.observacoes}
                    onChange={(e) => setNewAcordo({ ...newAcordo, observacoes: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" /> Mensagem de E-mail
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Selecionar Template</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(e) => {
                          const template = templates.find(t => t.id === parseInt(e.target.value));
                          if (template) setNewAcordo({ ...newAcordo, mensagem_email: template.conteudo });
                        }}
                      >
                        <option value="">Selecione um template...</option>
                        {templates.filter(t => t.tipo === 'email').map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Mensagem de e-mail..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newAcordo.mensagem_email}
                      onChange={(e) => setNewAcordo({ ...newAcordo, mensagem_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" /> Mensagem de WhatsApp
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Selecionar Template</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        onChange={(e) => {
                          const template = templates.find(t => t.id === parseInt(e.target.value));
                          if (template) setNewAcordo({ ...newAcordo, mensagem_whatsapp: template.conteudo });
                        }}
                      >
                        <option value="">Selecione um template...</option>
                        {templates.filter(t => t.tipo === 'whatsapp').map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Mensagem de WhatsApp..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      value={newAcordo.mensagem_whatsapp}
                      onChange={(e) => setNewAcordo({ ...newAcordo, mensagem_whatsapp: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-8 mt-8 border-t border-slate-100 dark:border-[#2A364A] shrink-0">
            <Button variant="outline" onClick={() => setShowAgreementModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateAgreement}>{editingAcordoId ? 'Salvar Alterações' : 'Criar Acordo'}</Button>
          </div>
        </div>
      </Modal>

      {/* New Title Modal */}
      <Modal
        isOpen={showNewTituloModal}
        onClose={() => setShowNewTituloModal(false)}
        title="Cadastrar Novo Título"
        size="lg"
      >
        <form onSubmit={handleCreateTitulo} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Cliente</label>
              <input
                type="text"
                required
                placeholder="Nome do cliente"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.cliente}
                onChange={(e) => setNewTitulo({ ...newTitulo, cliente: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Número do Documento (NF)</label>
              <input
                type="text"
                required
                placeholder="Ex: 12345"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.numero_documento}
                onChange={(e) => setNewTitulo({ ...newTitulo, numero_documento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor do Título</label>
              <input
                type="text"
                required
                placeholder="R$ 0,00"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.valor_documento}
                onChange={(e) => setNewTitulo({ ...newTitulo, valor_documento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Data de Emissão</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.data_emissao}
                onChange={(e) => setNewTitulo({ ...newTitulo, data_emissao: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Data de Vencimento</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.data_vencimento}
                onChange={(e) => setNewTitulo({ ...newTitulo, data_vencimento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Status Inicial</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.status_titulo}
                onChange={(e) => setNewTitulo({ ...newTitulo, status_titulo: e.target.value })}
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-[#2A364A]">
            <Button variant="outline" type="button" onClick={() => setShowNewTituloModal(false)}>Cancelar</Button>
            <Button type="submit">Cadastrar Título</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Title Modal */}
      <Modal
        isOpen={showEditTituloModal}
        onClose={() => setShowEditTituloModal(false)}
        title="Editar Título"
        size="lg"
      >
        <form onSubmit={handleEditTitulo} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Cliente</label>
              <input
                type="text"
                required
                placeholder="Nome do cliente"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.cliente}
                onChange={(e) => setNewTitulo({ ...newTitulo, cliente: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Número do Documento (NF)</label>
              <input
                type="text"
                required
                placeholder="Ex: 12345"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.numero_documento}
                onChange={(e) => setNewTitulo({ ...newTitulo, numero_documento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Valor do Título</label>
              <input
                type="text"
                required
                placeholder="R$ 0,00"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.valor_documento}
                onChange={(e) => setNewTitulo({ ...newTitulo, valor_documento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Data de Emissão</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.data_emissao}
                onChange={(e) => setNewTitulo({ ...newTitulo, data_emissao: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Data de Vencimento</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.data_vencimento}
                onChange={(e) => setNewTitulo({ ...newTitulo, data_vencimento: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Status</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTitulo.status_titulo}
                onChange={(e) => setNewTitulo({ ...newTitulo, status_titulo: e.target.value })}
              >
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-[#2A364A]">
            <Button variant="outline" type="button" onClick={() => setShowEditTituloModal(false)}>Cancelar</Button>
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Tem certeza que deseja excluir o título <strong>{selectedTitulo?.numero_documento}</strong>? Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteTitulo}>Excluir permanentemente</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ActionMenuItem({ icon: Icon, label, onClick, className }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#121826] hover:text-indigo-600 transition-colors cursor-pointer",
        className
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function HistoryItem({ disparo }: any) {
  const [expanded, setExpanded] = useState(false);
  const isWhatsapp = disparo.tipo_envio?.includes('whatsapp');
  const isErro = disparo.status === 'ERRO';

  return (
    <div className="border border-slate-100 dark:border-[#2A364A] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1E2738] hover:bg-slate-50 dark:hover:bg-[#121826] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isWhatsapp ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
          )}>
            {isWhatsapp ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {isWhatsapp ? 'WhatsApp' : 'E-mail'}
              <span className={cn("ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", isErro ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                {disparo.status}
              </span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(disparo.data_envio)}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform", expanded && "rotate-180")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-slate-50 dark:bg-[#121826] border-t border-slate-100 dark:border-[#2A364A] text-sm text-slate-600 dark:text-slate-300">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tipo: {disparo.tipo_envio}</p>
              {disparo.detalhes && <p className="italic">"{disparo.detalhes}"</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
