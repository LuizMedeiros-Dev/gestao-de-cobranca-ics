import { createOmieClient } from './backend/integrations/omieClient.ts';
import dotenv from 'dotenv';
dotenv.config();

const client = createOmieClient(
  process.env.ICS_OMIE_APP_KEY!,
  process.env.ICS_OMIE_APP_SECRET!
);

client.listarClientes(1).then(d => {
  const c = d.clientes_cadastro?.[0];
  if (!c) { console.log('Sem clientes'); return; }
  // Mostra todos os campos de email/contato disponíveis
  const camposEmail = Object.entries(c).filter(([k]) =>
    k.toLowerCase().includes('email') ||
    k.toLowerCase().includes('fone') ||
    k.toLowerCase().includes('tel') ||
    k.toLowerCase().includes('contato')
  );
  console.log('=== CAMPOS DE CONTATO DISPONÍVEIS NA API OMIE ===');
  console.log(JSON.stringify(camposEmail, null, 2));
  console.log('\n=== PRIMEIRO CLIENTE (campos principais) ===');
  console.log('razao_social:', c.razao_social);
  console.log('nome_fantasia:', c.nome_fantasia);
  console.log('email (campo usado no sync):', c.email);
}).catch(console.error);
