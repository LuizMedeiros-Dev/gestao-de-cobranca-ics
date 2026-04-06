import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/ui/Base';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, 
  MessageSquare, 
  Smartphone, 
  Mail, 
  Copy, 
  Trash2, 
  Edit3,
  Code,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesService } from '../services/api';
import { cn } from '../utils/utils';

export default function TemplatesMensagem() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    templatesService.getTemplates()
      .then(res => {
        setTemplates(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Conteúdo copiado para a área de transferência');
  };

  const handleDelete = (id: number) => {
    if (confirm('Deseja realmente excluir este template?')) {
      templatesService.deleteTemplate(id)
        .then(() => {
          toast.success('Template excluído!');
          fetchTemplates();
        })
        .catch(err => toast.error('Erro ao excluir: ' + err.message));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      nome: formData.get('nome'),
      tipo: formData.get('tipo'),
      conteudo: formData.get('conteudo'),
    };

    const promise = selectedTemplate 
      ? templatesService.updateTemplate(selectedTemplate.id, data)
      : templatesService.createTemplate(data);

    promise
      .then(() => {
        toast.success(selectedTemplate ? 'Template atualizado!' : 'Template criado!');
        setShowModal(false);
        fetchTemplates();
      })
      .catch(err => toast.error('Erro ao salvar: ' + err.message));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Templates de Mensagem</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os modelos de mensagens enviados aos seus clientes.</p>
        </div>
        <Button 
          className="gap-2"
          onClick={() => {
            setSelectedTemplate(null);
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500 dark:text-slate-400 italic">Carregando templates...</div>
        ) : templates.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-[#1E2738] border border-dashed border-slate-200 dark:border-[#2A364A] rounded-2xl">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Nenhum template encontrado. Crie o seu primeiro!</p>
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <div className="p-6 border-b border-slate-50 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    template.tipo === 'whatsapp' || template.canal === 'whatsapp' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {template.tipo === 'whatsapp' || template.canal === 'whatsapp' ? <Smartphone className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{template.nome}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider">{template.tipo || template.canal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyTemplate(template.conteudo)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowModal(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6 flex-1 bg-slate-50 dark:bg-[#121826]">
                <div className="bg-white dark:bg-[#1E2738] border border-slate-100 dark:border-[#2A364A] rounded-lg p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                  "{template.conteudo}"
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#121826] border-t border-slate-100 dark:border-[#2A364A] flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mr-2">Variáveis:</span>
                <VariableBadge name="{cliente}" />
                <VariableBadge name="{valor}" />
                <VariableBadge name="{vencimento}" />
                <VariableBadge name="{link_pagamento}" />
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-6 bg-indigo-600 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-[#1E2738]/10 rounded-xl">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Dica de Personalização</h3>
            <p className="text-indigo-100 text-sm">
              Use as variáveis entre chaves para que o sistema preencha automaticamente os dados de cada cliente e título.
            </p>
          </div>
        </div>
      </Card>

      {/* Template Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={selectedTemplate ? "Editar Template" : "Novo Template"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Nome do Template</label>
              <input 
                name="nome"
                type="text" 
                required
                defaultValue={selectedTemplate?.nome}
                placeholder="Ex: Lembrete de Vencimento" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Canal</label>
              <select 
                name="tipo"
                required
                defaultValue={selectedTemplate?.tipo || selectedTemplate?.canal || 'email'}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="email">E-mail</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Conteúdo da Mensagem</label>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase">
                <Info className="w-3 h-3" /> Variáveis disponíveis: {'{cliente}'}, {'{valor}'}, {'{vencimento}'}
              </div>
            </div>
            <textarea 
              name="conteudo"
              required
              defaultValue={selectedTemplate?.conteudo}
              rows={6} 
              placeholder="Olá {cliente}, informamos que seu título no valor de {valor} vence em {vencimento}..." 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-[#2A364A]">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Salvar Template</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function VariableBadge({ name }: { name: string }) {
  return (
    <span className="px-2 py-1 bg-slate-200 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono whitespace-nowrap">
      {name}
    </span>
  );
}
