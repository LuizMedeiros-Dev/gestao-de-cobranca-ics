import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Empresa {
  id: string;
  nome: string;
}

const EMPRESAS_DISPONIVEIS: Empresa[] = [
  { id: 'ics',    nome: 'ICS Sistemas' },
  { id: 'authen', nome: 'Authen' },
  { id: 'target', nome: 'Target' },
];

const STORAGE_KEY = 'empresa_selecionada';

function getEmpresaInicial(): Empresa {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Empresa;
      if (EMPRESAS_DISPONIVEIS.find(e => e.id === parsed.id)) return parsed;
    }
  } catch {}
  return EMPRESAS_DISPONIVEIS[0];
}

interface EmpresaContextType {
  empresa: Empresa;
  setEmpresa: (empresa: Empresa) => void;
  empresasDisponiveis: Empresa[];
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresaState] = useState<Empresa>(getEmpresaInicial);

  const setEmpresa = (emp: Empresa) => {
    setEmpresaState(emp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emp));
    // Força recarregamento dos dados ao trocar de empresa
    window.dispatchEvent(new CustomEvent('empresa-changed', { detail: emp }));
  };

  return (
    <EmpresaContext.Provider value={{ empresa, setEmpresa, empresasDisponiveis: EMPRESAS_DISPONIVEIS }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
}
