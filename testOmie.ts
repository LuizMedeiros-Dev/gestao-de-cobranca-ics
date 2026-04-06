import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

async function test() {
  const appKey = process.env.ICS_OMIE_APP_KEY;
  const appSecret = process.env.ICS_OMIE_APP_SECRET;
  
  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/geral/clientes/', {
      call: 'ListarClientes',
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 50, apenas_importado_api: 'N' }],
    });
    fs.writeFileSync('omieResponse.json', JSON.stringify(res.data, null, 2));
  } catch(e: any) {
    if (e.response) {
      fs.writeFileSync('omieResponse.json', JSON.stringify(e.response.data, null, 2));
    } else {
      fs.writeFileSync('omieResponse.json', JSON.stringify({ error: e.message }));
    }
  }
}
test();
