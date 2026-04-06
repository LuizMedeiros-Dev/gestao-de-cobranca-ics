import axios from 'axios';

const OMIE_BASE_URL = 'https://app.omie.com.br/api/v1';

/** Verifica se a resposta do Omie contém um erro (faultstring) e lança exceção */
function checkOmieError(data: any) {
  if (data?.faultstring) {
    const msg = data.faultstring as string;
    // Credenciais inválidas
    if (msg.includes('AppKey') || msg.includes('AppSecret') || msg.includes('credencial') || data.faultcode?.includes('5006')) {
      throw new Error(`Credenciais Omie inválidas: ${msg}`);
    }
    throw new Error(`Erro Omie (${data.faultcode}): ${msg}`);
  }
}

export function createOmieClient(appKey: string, appSecret: string) {
  const omieApi = axios.create({
    baseURL: OMIE_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    async listarClientes(pagina: number = 1) {
      const response = await omieApi.post('/geral/clientes/', {
        call: 'ListarClientes',
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina, registros_por_pagina: 50, apenas_importado_api: 'N' }],
      });
      checkOmieError(response.data);
      return response.data;
    },

    async listarContasReceber(pagina: number = 1) {
      const response = await omieApi.post('/financas/contareceber/', {
        call: 'ListarContasReceber',
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina, registros_por_pagina: 50 }],
      });
      checkOmieError(response.data);
      return response.data;
    },
  };
}
