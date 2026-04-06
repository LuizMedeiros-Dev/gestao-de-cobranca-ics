import { query } from './backend/config/database.ts';
import dotenv from 'dotenv';
dotenv.config();

query('SELECT id, nome, tipo FROM templates LIMIT 20')
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  })
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  });
