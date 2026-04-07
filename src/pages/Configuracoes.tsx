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
  Moon,
  UserPlus,
  Search,
  UsersRound,
  RotateCcw,
  Edit2,
  X
} from 'lucide-react';
import { titulosService, authService } from '../services/api';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';

export default function Configuracoes() {
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
    password: '',
    cargo: '' // Será preenchido pelo formulário
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState({ nome: '', cpf: '', email: '' });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', cpf: '', cargo: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsersList = () => {
    if (!searchParams.nome.trim() && !searchParams.cpf.trim() && !searchParams.email.trim()) {
      toast.error('Preencha ao menos um campo para realizar a busca.');
      setUsersList([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    authService.listUsers(searchParams)
      .then(res => {
        setUsersList(res.data);
        setHasSearched(true);
      })
      .catch(err => toast.error('Erro ao buscar usuários: ' + err.message))
      .finally(() => setSearching(false));
  };

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

    const hasMinLength = newUser.password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newUser.password);
    const hasNumber = /[0-9]/.test(newUser.password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newUser.password);

    if (!hasMinLength || !hasUpperCase || !hasNumber || !hasSpecial) {
      return toast.error('A senha não atende aos requisitos mínimos de segurança.');
    }

    if (!newUser.cargo) {
      return toast.error('Por favor, selecione o tipo de usuário.');
    }

    if (/\D/.test(newUser.cpf)) {
      return toast.error('O CPF deve conter apenas números.');
    }

    if (newUser.cpf.length !== 11) {
      return toast.error('O CPF deve conter exatamente 11 números.');
    }

    setCreatingUser(true);
    authService.createUser(newUser)
      .then(() => {
        toast.success('Usuário criado com sucesso!');
        setNewUser({ nome: '', cpf: '', email: '', password: '', cargo: '' });
        fetchUsersList(); // Atualiza a lista
      })
      .catch(err => toast.error('Erro ao criar usuário: ' + (err.response?.data?.error || err.message)))
      .finally(() => setCreatingUser(false));
  };

  const handleResetPassword = (userId: string, userName: string) => {
    if (!confirm(`Deseja realmente redefinir a senha de ${userName} para o padrão "Acesso123@"?`)) return;

    setResettingId(userId);
    authService.resetPassword(userId)
      .then((res: any) => {
        toast.success(`Senha de ${userName} redefinida com sucesso para: Acesso123@`, {
          duration: 5000
        });
      })
      .catch(err => toast.error('Erro ao redefinir: ' + err.message))
      .finally(() => setResettingId(null));
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setEditForm({
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      cargo: user.cargo
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    authService.updateUserAdmin(editingUser.id, editForm)
      .then(() => {
        toast.success('Usuário atualizado com sucesso!');
        setEditingUser(null);
        fetchUsersList(); // Refresh list
      })
      .catch(err => toast.error('Erro ao atualizar: ' + err.message))
      .finally(() => setSavingEdit(false));
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações de Usuário</h1>
      </div>

      <div className="max-w-4xl">
        <div className="space-y-6">

          
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Novo Usuário
            </h3>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de Usuário</label>
                <select 
                  value={newUser.cargo}
                  onChange={e => setNewUser({...newUser, cargo: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Selecione um tipo...</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Usuário">Usuário</option>
                </select>
              </div>

              <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-[#121826] border border-slate-100 dark:border-[#2A364A] rounded-xl mt-2">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Requisitos da Senha:</p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <li className={`text-[10px] flex items-center gap-1.5 ${newUser.password.length >= 8 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${newUser.password.length >= 8 ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Mínimo 8 caracteres
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[A-Z]/.test(newUser.password) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[A-Z]/.test(newUser.password) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Uma letra maiúscula
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[0-9]/.test(newUser.password) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[0-9]/.test(newUser.password) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Pelo menos um número
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newUser.password) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newUser.password) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Caractere especial
                  </li>
                </ul>
              </div>
              
              <div className="md:col-span-2 flex justify-end mt-4">
                <Button type="submit" className="gap-2 bg-indigo-600 hover:bg-indigo-700" disabled={creatingUser}>
                  <Save className="w-4 h-4" /> {creatingUser ? 'Criando...' : 'Cadastrar Usuário'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UsersRound className="w-5 h-5 text-indigo-600" />
                Localizar Usuários Ativos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome</label>
                  <input 
                    type="text"
                    placeholder="Filtrar por nome..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchParams.nome}
                    onChange={e => setSearchParams({...searchParams, nome: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">CPF</label>
                  <input 
                    type="text"
                    placeholder="Filtrar por CPF (apenas números)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchParams.cpf}
                    onChange={e => setSearchParams({...searchParams, cpf: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">E-mail</label>
                  <input 
                    type="text"
                    placeholder="Filtrar por e-mail..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchParams.email}
                    onChange={e => setSearchParams({...searchParams, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={fetchUsersList} disabled={searching} className="gap-2">
                  <Search className="w-4 h-4" /> {searching ? 'Pesquisando...' : 'Pesquisar'}
                </Button>
              </div>
            </div>

            {hasSearched && (
              <div className="mt-8 border-t border-slate-100 dark:border-[#2A364A] pt-8 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#2A364A]">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuário</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length > 0 ? usersList.map(u => (
                      <tr key={u.id} className="border-b border-slate-50 dark:border-[#2A364A]/50 hover:bg-slate-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => handleEditClick(u)}
                            className="flex flex-col text-left group"
                          >
                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">{u.nome}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{u.email}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.cargo === 'Administrador' ? 'success' : 'info'}>
                            {u.cargo}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500 text-sm">Nenhum usuário encontrado com os filtros informados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Editar Cadastro de Usuário"
        size="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome Completo</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={editForm.nome}
                onChange={e => setEditForm({...editForm, nome: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPF</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={editForm.cpf}
                onChange={e => setEditForm({...editForm, cpf: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">E-mail</label>
              <input 
                type="email" 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={editForm.email}
                onChange={e => setEditForm({...editForm, email: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo de Usuário</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={editForm.cargo}
                onChange={e => setEditForm({...editForm, cargo: e.target.value})}
                required
              >
                <option value="Administrador">Administrador</option>
                <option value="Usuário">Usuário</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Redefinir Senha</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Define a senha para o padrão: <span className="font-bold">Acesso123@</span></p>
              </div>
            </div>
            <button
               type="button"
              onClick={() => editingUser && handleResetPassword(editingUser.id, editingUser.nome)}
              disabled={resettingId === editingUser?.id}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {resettingId === editingUser?.id ? 'Redefinindo...' : 'Executar Reset'}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2A364A]">
            <Button 
               type="button"
              variant="outline" 
              onClick={() => setEditingUser(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>
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
