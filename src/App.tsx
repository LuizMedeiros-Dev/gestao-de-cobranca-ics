/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { DashboardLayout } from './layout/DashboardLayout';
import { EmpresaProvider } from './contexts/EmpresaContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Dashboard from './pages/Dashboard';
import Titulos from './pages/Titulos';
import ContasReceber from './pages/ContasReceber';
import RegrasCobranca from './pages/RegrasCobranca';
import TemplatesMensagem from './pages/TemplatesMensagem';
import PainelControle from './pages/PainelControle';
import Configuracoes from './pages/Configuracoes';
import DetalhesTitulo from './pages/DetalhesTitulo';
import Clientes from './pages/Clientes';
import Login from './pages/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true);
      setLocation('/');
    }
  };

  // Enquanto verifica o estado inicial, não renderiza nada para evitar flicker
  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
      <EmpresaProvider>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/titulos" component={Titulos} />
            <Route path="/titulos/:id" component={DetalhesTitulo} />
            <Route path="/contas-receber" component={ContasReceber} />
            <Route path="/regras" component={RegrasCobranca} />
            <Route path="/templates" component={TemplatesMensagem} />
            <Route path="/painel" component={PainelControle} />
            <Route path="/configuracoes" component={Configuracoes} />
            <Route path="/clientes" component={Clientes} />
            
            {/* Fallback route */}
            <Route>
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">404</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Página não encontrada</p>
              </div>
            </Route>
          </Switch>
        </DashboardLayout>
      </EmpresaProvider>
    </ThemeProvider>
  );
}
