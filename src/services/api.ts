import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Interceptor: injeta Token e X-Empresa-Id em toda requisição
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const saved = localStorage.getItem('empresa_selecionada');
    if (saved) {
      const empresa = JSON.parse(saved);
      if (empresa?.id) {
        config.headers['X-Empresa-Id'] = empresa.id;
      }
    }
  } catch { }
  return config;
});

// Interceptor: lida com erros de autenticação (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        window.location.href = '/'; // Redireciona para login
      }
    }
    return Promise.reject(error);
  }
);

export const dashboardService = {
  getStats: (params?: { startDate?: string; endDate?: string }) => api.get('/dashboard', { params }),
  getProjecao: () => api.get('/dashboard/projecao'),
};

export const titulosService = {
  getTitulos: (params?: { status?: string; search?: string }) => api.get('/titulos', { params }),
  getTituloById: (id: string) => api.get(`/titulos/${id}`),
  createTitulo: (data: any) => api.post('/titulos', data),
  getContasReceberSummary: () => api.get('/contas-receber'),
  getRegras: () => api.get('/regras'),
  createRegra: (data: any) => api.post('/regras', data),
  updateRegra: (id: number, data: any) => api.put(`/regras/${id}`, data),
  deleteRegra: (id: number) => api.delete(`/regras/${id}`),
  getTemplates: () => api.get('/templates'),
  getConfig: () => api.get('/config'),
  updateConfig: (data: any) => api.post('/config', data),
  getPanelData: () => api.get('/painel'),
  // Acordos
  getAcordos: (tituloId: number) => api.get(`/titulos/${tituloId}/acordos`),
  createAcordo: (tituloId: number, data: any) => api.post(`/titulos/${tituloId}/acordos`, data),
  updateAcordo: (id: number, data: any) => api.put(`/acordos/${id}`, data),
  deleteAcordo: (id: number) => api.delete(`/acordos/${id}`),
  // User
  getUser: () => api.get('/user'),
  updateUser: (data: any) => api.put('/user', data),
  changePassword: (data: any) => api.post('/user/change-password', data),
};

export const contasReceberService = {
  getSummary: (params?: { startDate?: string; endDate?: string }) => api.get('/contas-receber', { params }),
  getRiskClients: (nivel: string) => api.get(`/contas-receber/risco/${nivel}`),
};

export const templatesService = {
  getTemplates: () => api.get('/templates'),
  saveTemplate: (data: any) => api.post('/templates', data),
  createTemplate: (data: any) => api.post('/templates', data),
  updateTemplate: (id: number, data: any) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete(`/templates/${id}`),
};

export const configService = {
  getConfig: () => api.get('/config'),
  saveConfig: (data: any) => api.post('/config', data),
};

export const painelService = {
  getPainel: () => api.get('/painel'),
};

export const omieService = {
  syncManual: () => api.post('/omie/sync'),
  // Sincroniza empresa específica
  syncEmpresa: (empresaId: string) => api.post(`/omie/sync/${empresaId}`),
};

export const authService = {
  login: (data: any) => api.post('/login', data),
  createUser: (data: any) => api.post('/users', data),
  listUsers: (params?: any) => api.get('/users-list', { params }),
  updateUserAdmin: (id: string, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: string) => api.post(`/users/${id}/reset-password`),
};

export const clientesService = {
  getClientes: (params?: { search?: string }) => api.get('/clientes', { params }),
  getCliente: (id: number) => api.get(`/clientes/${id}`),
  getExtratoPdf: (id: number) => api.get(`/clientes/${id}/pdf`, { responseType: 'blob' }),
  updateCliente: (id: number, data: { email?: string; telefone?: string }) => api.put(`/clientes/${id}`, data),
};

export const cobrancaManualService = {
  cobrarTitulo: (tituloId: number, canal: 'email' | 'whatsapp', mensagem: string) =>
    api.post(`/titulos/${tituloId}/cobrar`, { canal, mensagem }),
  getHistorico: (tituloId: number) => api.get(`/titulos/${tituloId}/historico`),
  executarRegras: () => api.post('/cobranca/executar'),
  statusProvedores: () => api.get('/provedores/status'),
};

export const relatorioService = {
  getPdf: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/relatorio/pdf', { params, responseType: 'blob' }),
};

export default api;
