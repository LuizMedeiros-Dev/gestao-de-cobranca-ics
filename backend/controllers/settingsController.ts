import { Request, Response } from 'express';
import { query } from '../config/database.ts';

/**
 * Cache temporário para o status dos provedores para evitar requisições frequentes.
 */
let providerStatusCache: { data: any; lastUpdate: number } | null = null;
const CACHE_TTL = 30000; // 30 segundos

/**
 * Controller responsavel pelas configurações gerais de negocio (Regras, Templates, Usario, Sistema)
 */
export const settingsController = {
  // ──────────────── HEALTH & SYSTEM ────────────────
  async getHealth(req: Request, res: Response) {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error: any) {
      res.status(500).json({
        status: 'error', database: 'disconnected',
        message: error.message, hint: 'Verifique se a DATABASE_URL está correta nas configurações do ambiente.'
      });
    }
  },

  async getProvedoresStatus(req: Request, res: Response) {
    try {
      const now = Date.now();
      if (providerStatusCache && (now - providerStatusCache.lastUpdate < CACHE_TTL)) {
        return res.json(providerStatusCache.data);
      }

      const { emailService } = await import('../services/emailService.ts');
      const { whatsappService } = await import('../services/whatsappService.ts');
      const [email, whatsapp] = await Promise.all([
        emailService.verificarConexao(),
        whatsappService.verificarConexao(),
      ]);

      const statusData = { email, whatsapp };
      providerStatusCache = { data: statusData, lastUpdate: now };

      res.json(statusData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ──────────────── TEMPLATES ────────────────
  async getTemplates(req: Request, res: Response) {
    try {
      const result = await query('SELECT * FROM templates');
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async createTemplate(req: Request, res: Response) {
    const { nome, tipo, conteudo } = req.body;
    try {
      const result = await query('INSERT INTO templates (nome, tipo, conteudo) VALUES ($1, $2, $3) RETURNING id', [nome, tipo, conteudo]);
      res.json({ id: result.rows[0].id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateTemplate(req: Request, res: Response) {
    const { id } = req.params;
    const { nome, tipo, conteudo } = req.body;
    try {
      await query('UPDATE templates SET nome = $1, tipo = $2, conteudo = $3 WHERE id = $4', [nome, tipo, conteudo, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async deleteTemplate(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await query('DELETE FROM templates WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ──────────────── REGRAS ────────────────
  async getRegras(req: Request, res: Response) {
    try {
      const result = await query(`
        SELECT r.*, t.nome as template_nome, t.tipo as canal
        FROM regras_cobranca r
        LEFT JOIN templates t ON r.template_id = t.id
      `);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async createRegra(req: Request, res: Response) {
    const { nome, canal, dias_atraso, template_id } = req.body;
    try {
      const result = await query(`
        INSERT INTO regras_cobranca (nome, canal, dias_atraso, template_id) 
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [nome, canal, dias_atraso, template_id]);
      res.json({ id: result.rows[0].id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateRegra(req: Request, res: Response) {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    try {
      await query(`UPDATE regras_cobranca SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async deleteRegra(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await query('DELETE FROM regras_cobranca WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ──────────────── GLOBAL CONFIGS ────────────────
  async getConfig(req: Request, res: Response) {
    try {
      const result = await query('SELECT value FROM config WHERE key = $1', ['app_name']);
      res.json({ app_name: result.rows[0]?.value || 'Sistema de Cobrança' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateConfig(req: Request, res: Response) {
    const { app_name } = req.body;
    try {
      await query(`
        INSERT INTO config (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, ['app_name', app_name]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // ──────────────── USERS ────────────────
  async getUser(req: Request, res: Response) {
    try {
      const result = await query('SELECT * FROM users LIMIT 1');
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateUser(req: Request, res: Response) {
    const { nome, email } = req.body;
    try {
      await query('UPDATE users SET nome = $1, email = $2 WHERE id = (SELECT id FROM users LIMIT 1)', [nome, email]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    try {
      const result = await query('SELECT password FROM users LIMIT 1');
      const user = result.rows[0];
      if (user.password && user.password !== currentPassword) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }
      await query('UPDATE users SET password = $1 WHERE id = (SELECT id FROM users LIMIT 1)', [newPassword]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    try {
      const result = await query('SELECT * FROM users WHERE (email = $1 OR cpf = $1 OR nome = $1) AND password = $2', [username, password]);
      if (result.rows.length > 0) {
        res.json({ success: true, user: result.rows[0] });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async createUser(req: Request, res: Response) {
    const { nome, cpf, email, password } = req.body;
    try {
      await query(`
        INSERT INTO users (nome, email, cpf, password, cargo) 
        VALUES ($1, $2, $3, $4, 'Administrador')
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, cpf = EXCLUDED.cpf, nome = EXCLUDED.nome
      `, [nome, email, cpf, password]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
