import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 segundos de timeout
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err.message);
});

export const query = (text: string, params?: any[]) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Configure-a no menu Settings > Environment Variables.');
  }
  return pool.query(text, params);
};

export default pool;
