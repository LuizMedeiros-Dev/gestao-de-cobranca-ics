import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';

import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  Settings2, 
  MessageSquare, 
  ShieldCheck, 
  LogOut,
  ChevronDown,
  Building,
  Users,
  UserRoundCog,
  UserPlus,
  Sun,
  Moon
} from 'lucide-react';
import { cn, formatCurrency } from '../utils/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useTheme } from '../contexts/ThemeContext';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Base';
import { titulosService } from '../services/api';
import { toast } from 'sonner';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: FileText, label: 'Títulos', href: '/titulos' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: Wallet, label: 'Contas a Receber', href: '/contas-receber' },
  { icon: Settings2, label: 'Regras de Cobrança', href: '/regras' },
  { icon: MessageSquare, label: 'Templates', href: '/templates' },
  { icon: ShieldCheck, label: 'Painel de Controle', href: '/painel' },
  { icon: UserRoundCog, label: 'Usuários', href: '/configuracoes' },
];

export function Sidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { empresa, setEmpresa, empresasDisponiveis } = useEmpresa();
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ nome: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    titulosService.getUser().then(res => {
      setUser(res.data);
      setProfileForm({ nome: res.data.nome, email: res.data.email });
    });
  }, []);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    titulosService.updateUser(profileForm)
      .then(() => {
        toast.success('Perfil atualizado!');
        setUser({ ...user, ...profileForm });
      })
      .catch(err => toast.error('Erro ao atualizar: ' + err.message));
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      return toast.error('As novas senhas não coincidem');
    }
    const hasMinLength = passwordForm.new.length >= 8;
    const hasUpperCase = /[A-Z]/.test(passwordForm.new);
    const hasNumber = /[0-9]/.test(passwordForm.new);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(passwordForm.new);

    if (!hasMinLength || !hasUpperCase || !hasNumber || !hasSpecial) {
      return toast.error('A senha deve ter 8+ caracteres, uma maiúscula, um número e um caractere especial.');
    }

    titulosService.changePassword({ 
      currentPassword: passwordForm.current, 
      newPassword: passwordForm.new 
    })
      .then(() => {
        toast.success('Senha alterada com sucesso!');
        setPasswordForm({ current: '', new: '', confirm: '' });
      })
      .catch(err => toast.error(err.response?.data?.error || 'Erro ao alterar senha'));
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/';
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#1E2738] border-r border-slate-100 dark:border-[#2A364A] h-screen flex flex-col sticky top-0 z-20">
      <div className="p-6 relative">
        <button 
          onClick={() => setShowCompanySwitcher(!showCompanySwitcher)}
          className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 dark:bg-[#121826] transition-colors group text-left"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Building className="text-white w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block truncate">{empresa.nome}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Empresa</span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform", showCompanySwitcher && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showCompanySwitcher && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-6 right-6 top-20 bg-white dark:bg-[#1E2738] border border-slate-100 dark:border-[#2A364A] shadow-xl rounded-xl p-2 z-30"
            >
              {empresasDisponiveis.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setEmpresa(emp);
                    setShowCompanySwitcher(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    emp.id === empresa.id ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#121826]"
                  )}
                >
                  {emp.nome}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        {menuItems.map((item) => {
          // Oculta o menu de usuários para quem não é administrador
          if (item.href === '/configuracoes' && user?.cargo !== 'Administrador') {
            return null;
          }

          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group",
                isActive 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-[#121826] hover:text-slate-900 dark:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:text-slate-300")} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {isActive && (
                <motion.div layoutId="active-pill" className="w-1 h-4 bg-indigo-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-[#2A364A]">
        <div 
          className="flex items-center gap-3 p-2 mb-4 hover:bg-slate-50 dark:bg-[#121826] rounded-xl transition-colors cursor-pointer group"
          onClick={() => setShowProfileModal(true)}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {user?.nome?.substring(0, 2).toUpperCase() || 'LF'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.nome || 'Luiz Fellipe'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.cargo || 'Admin'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>

      {/* Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Meu Perfil"
        size="lg"
        headerAction={
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>
        }
      >
        <div className="space-y-8">
          {/* Basic Info */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> Informações Básicas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={profileForm.nome}
                  onChange={e => setProfileForm({...profileForm, nome: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">E-mail</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={profileForm.email}
                  onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Salvar Alterações</Button>
            </div>
          </form>

          <div className="h-px bg-slate-100" />

          {/* Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" /> Alterar Senha
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Senha Atual</label>
                <div className="relative">
                  <input 
                    type={showPasswords.current ? "text" : "password"}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={passwordForm.current}
                    onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                    className="absolute right-3 top-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.new ? "text" : "password"}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={passwordForm.new}
                      onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                      className="absolute right-3 top-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.confirm ? "text" : "password"}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-[#2A364A] rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                      className="absolute right-3 top-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#121826] border border-slate-100 dark:border-[#2A364A] rounded-xl">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Requisitos da Nova Senha:</p>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <li className={`text-[10px] flex items-center gap-1.5 ${passwordForm.new.length >= 8 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${passwordForm.new.length >= 8 ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Mínimo 8 caracteres
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[A-Z]/.test(passwordForm.new) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[A-Z]/.test(passwordForm.new) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Uma letra maiúscula
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[0-9]/.test(passwordForm.new) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[0-9]/.test(passwordForm.new) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Pelo menos um número
                  </li>
                  <li className={`text-[10px] flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(passwordForm.new) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    <div className={`w-1 h-1 rounded-full ${/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(passwordForm.new) ? 'bg-emerald-600' : 'bg-slate-300'}`} /> Caractere especial
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="outline">Alterar Senha</Button>
            </div>
          </form>
        </div>
      </Modal>
    </aside>
  );
}
