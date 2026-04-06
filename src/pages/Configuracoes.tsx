import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/ui/Base';
import { 
  Building2, 
  Globe, 
  Shield, 
  Bell, 
  CreditCard,
  Save,
  RefreshCw,
  Key,
  Moon
} from 'lucide-react';
import { titulosService, authService } from '../services/api';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

export default function Configuracoes() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState({
    app_name: '',
    empresa_nome: '',
    empresa_cnpj: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newUser, setNewUser] = useState({
    nome: '',
    cpf: '',
    email: '',
    password: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    titulosService.getConfig()
      .then(res => {
        setConfig(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = () => {
    setSaving(true);
    titulosService.updateConfig(config)
      .then(() => {
        toast.success('Configurações salvas com sucesso!');
      })
      .catch(err => toast.error('Erro ao salvar: ' + err.message))
      .finally(() => setSaving(false));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    authService.createUser(newUser)
      .then(() => {
        toast.success('Usuário master criado com sucesso!');
        setNewUser({ nome: '', cpf: '', email: '', password: '' });
      })
      .catch(err => toast.error('Erro ao criar usuário: ' + err.message))
      .finally(() => setCreatingUser(false));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie as preferências da sua conta e do sistema.</p>
      </div>

      <div className="max-w-4xl">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Dados Gerais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Nome do Aplicativo</label>
                <input 
                  type="text" 
                  value={config.app_name} 
                  onChange={e => setConfig({...config, app_name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Razão Social</label>
                <input 
                  type="text" 
                  value={config.empresa_nome} 
                  onChange={e => setConfig({...config, empresa_nome: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">CNPJ</label>
                <input 
                  type="text" 
                  value={config.empresa_cnpj} 
                  onChange={e => setConfig({...config, empresa_cnpj: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>

          <Card className="p-6 mt-8">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              Preferências do Sistema
            </h3>
            <div className="space-y-4 max-w-sm">
              <ToggleItem 
                label="Tema Escuro (Dark Mode)" 
                checked={theme === 'dark'} 
                onChange={toggleTheme} 
              />
            </div>
          </Card>
          
          <Card className="p-6 mt-8">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Novo Usuário Administrador
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Nome Completo</label>
                <input 
                  type="text" 
                  value={newUser.nome}
                  onChange={e => setNewUser({...newUser, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">CPF</label>
                <input 
                  type="text" 
                  value={newUser.cpf}
                  onChange={e => setNewUser({...newUser, cpf: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Senha</label>
                <input 
                  type="password" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>
              
              <div className="md:col-span-2 flex justify-end mt-4">
                <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={creatingUser}>
                  <Save className="w-4 h-4" /> {creatingUser ? 'Criando...' : 'Cadastrar Usuário'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({ label, checked, onChange }: { label: string; checked: boolean; onChange?: () => void }) {
  return (
    <div className="flex items-center justify-between cursor-pointer" onClick={onChange}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 select-none">{label}</span>
      <div className={cn(
        "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
        checked ? "bg-indigo-600" : "bg-slate-200"
      )}>
        <div className={cn(
          "absolute top-1 w-3 h-3 bg-white dark:bg-[#1E2738] rounded-full transition-all",
          checked ? "left-6" : "left-1"
        )} />
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
