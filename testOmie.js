const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const appKey = process.env.ICS_OMIE_APP_KEY;
  const appSecret = process.env.ICS_OMIE_APP_SECRET;
  
  console.log("Testing with key:", appKey);
  
  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/geral/clientes/', {
      call: 'ListarClientes',
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 50, apenas_importado_api: 'N' }],
    });
    console.log("Success:", Object.keys(res.data));
  } catch(e) {
    if (e.response) {
      console.log("Error logic:", e.response.status, e.response.data);
    } else {
      console.error("Network error:", e.message);
    }
  }
}
test();
