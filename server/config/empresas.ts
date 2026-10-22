import dotenv from 'dotenv';
dotenv.config();

export interface EmpresaConfig {
  id: string;
  nome: string;
  omieAppKey: string;
  omieAppSecret: string;
}

export const EMPRESAS: Record<string, EmpresaConfig> = {
  ics: {
    id: 'ics',
    nome: 'ICS Sistemas',
    omieAppKey: process.env.ICS_OMIE_APP_KEY || '',
    omieAppSecret: process.env.ICS_OMIE_APP_SECRET || '',
  },
  authen: {
    id: 'authen',
    nome: 'Authen',
    omieAppKey: process.env.AUTHEN_OMIE_APP_KEY || '',
    omieAppSecret: process.env.AUTHEN_OMIE_APP_SECRET || '',
  },
  target: {
    id: 'target',
    nome: 'Target',
    omieAppKey: process.env.TARGET_OMIE_APP_KEY || '',
    omieAppSecret: process.env.TARGET_OMIE_APP_SECRET || '',
  },
};

export function getEmpresaConfig(empresaId: string): EmpresaConfig {
  const config = EMPRESAS[empresaId];
  if (!config) {
    throw new Error(`Empresa '${empresaId}' não configurada. IDs válidos: ${Object.keys(EMPRESAS).join(', ')}`);
  }
  return config;
}

export const EMPRESA_IDS = Object.keys(EMPRESAS);
