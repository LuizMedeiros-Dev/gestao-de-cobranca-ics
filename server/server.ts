import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRoutes from './routes/api.ts';
import omieRoutes from './routes/omieRoutes.ts';
import { initSyncJob } from './jobs/syncJob.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.use('/api', apiRoutes);
  app.use('/api/omie', omieRoutes);

  // Start OMIE Sync Job (inclui sincronização OMIE a cada 30min + regras de cobrança às 8h)
  initSyncJob().catch(err => {
    console.error('Falha ao iniciar Job de Sincronização (Verifique DATABASE_URL):', err.message);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
