import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/ui/Base';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Trash2, 
  Edit3,
  ToggleLeft,
  ToggleRight,
  Clock,
  X
} from 'lucide-react';
import { titulosService } from '../services/api';
import { toast } from 'sonner';

export default function RegrasCobranca() {
  const [regras, setRegras] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegra, setEditingRegra] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    canal: 'email',
    dias_atraso: 0,
    template_id: ''
  });

  const fetchRegras = () => {
    setLoading(true);
    titulosService.getRegras()
      .then(res => {
        setRegras(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchTemplates = () => {
    titulosService.getTemplates()
      .then(res => setTemplates(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchRegras();
    fetchTemplates();
  }, []);

  const toggleRegra = (id: number, currentStatus: any) => {
    const newStatus = currentStatus ? 0 : 1;
    titulosService.updateRegra(id, { ativo: newStatus })
      .then(() => {
        toast.info('Status da regra atualizado');
        fetchRegras();
      })
      .catch(err => toast.error('Erro: ' + err.message));
  };

  const deleteRegra = (id: number) => {
    titulosService.deleteRegra(id)
      .then(() => {
        toast.error('Regra excluída com sucesso');
        setShowDeleteConfirm(null);
        fetchRegras();
      })
      .catch(err => toast.error('Erro: ' + err.message));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingRegra 
      ? titulosService.updateRegra(editingRegra.id, formData)
      : titulosService.createRegra(formData);

    action
      .then(() => {
        toast.success(editingRegra ? 'Regra atualizada!' : 'Regra criada!');
        setShowModal(false);
        setEditingRegra(null);
        setFormData({ nome: '', canal: 'email', dias_atraso: 0, template_id: '' });
        fetchRegras();
      })
      .catch(err => toast.error('Erro ao salvar: ' + err.message));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando regras...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Régua de Cobrança</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure as regras automáticas de notificação para seus clientes.</p>
        </div>
        <Button className="gap-2" onClick={() => {
          setEditingRegra(null);
          setFormData({ nome: '', canal: 'email', dias_atraso: 0, template_id: '' });
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4" /> Criar Nova Regra
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {regras.map((regra) => (
          <Card key={regra.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  regra.canal === 'whatsapp' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                )}>
                  {regra.canal === 'whatsapp' ? <Smartphone className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{regra.nome}</h3>
                    {regra.ativo ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="default">Inativa</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {regra.dias_atraso === 0 ? 'No dia do vencimento' : 
                         regra.dias_atraso < 0 ? `${Math.abs(regra.dias_atraso)} dias antes do vencimento` : 
                         `${regra.dias_atraso} dias após o vencimento`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>Template: {regra.template_nome || 'Nenhum'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleRegra(regra.id, regra.ativo)}
                  className="p-2 hover:bg-slate-50 dark:bg-[#121826] rounded-lg transition-colors cursor-pointer"
                >
                  {regra.ativo ? (
                    <ToggleRight className="w-8 h-8 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
                <div className="w-px h-8 bg-slate-100 mx-2" />
                <Button variant="ghost" size="icon" onClick={() => {
                  setEditingRegra(regra);
                  setFormData({
                    nome: regra.nome,
                    canal: regra.canal,
                    dias_atraso: regra.dias_atraso,
                    template_id: regra.template_id || ''
                  });
                  setShowModal(true);
                }}>
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(regra.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900 text-sm">Atenção!</p>
              <p className="text-red-700 text-xs">Esta ação não pode ser desfeita. Deseja realmente excluir esta regra de cobrança?</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => showDeleteConfirm && deleteRegra(showDeleteConfirm)}
            >
              Excluir Regra
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRegra ? 'Editar Regra' : 'Nova Regra'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Nome da Regra</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Lembrete 3 dias antes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Canal</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.canal}
                onChange={e => setFormData({...formData, canal: e.target.value})}
              >
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Dias (Atraso/Antecipação)</label>
              <input 
                type="number" 
                required
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.dias_atraso}
                onChange={e => setFormData({...formData, dias_atraso: parseInt(e.target.value)})}
                placeholder="0 = No dia"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Negativo para antecipação</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Template de Mensagem</label>
            <select 
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.template_id}
              onChange={e => setFormData({...formData, template_id: e.target.value})}
            >
              <option value="">Selecione um template</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.canal})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Salvar Regra</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
