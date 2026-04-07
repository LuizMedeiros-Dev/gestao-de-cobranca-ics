import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.ts';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'ics_segredo_padrao_mudar_em_producao';

/**
 * Cache temporário para o status dos provedores para evitar requisições frequentes.
 */
let providerStatusCache: { data: any; lastUpdate: number } | null = null;
const CACHE_TTL = 30000; // 30 segundos

/**
 * Valida se a senha atende aos requisitos de segurança:
 * - Pelo menos 8 caracteres
 * - Pelo menos uma letra maiúscula
 * - Pelo menos um número
 * - Pelo menos um caractere especial (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
function isStrongPassword(password: string): boolean {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  return hasMinLength && hasUpperCase && hasNumber && hasSpecial;
}

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
    const userId = res.locals.userId;
    try {
      const result = await query('SELECT id, nome, email, cpf, cargo, foto_url FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateUser(req: Request, res: Response) {
    const userId = res.locals.userId;
    const { nome, email } = req.body;
    try {
      await query('UPDATE users SET nome = $1, email = $2 WHERE id = $3', [nome, email, userId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const userId = res.locals.userId;
    try {
      const result = await query('SELECT password FROM users WHERE id = $1', [userId]);
      const user = result.rows[0];
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }

      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ 
          error: 'A nova senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.' 
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    try {
      // Login restrito a Email ou CPF para evitar ambiguidades com nomes duplicados
      const result = await query('SELECT * FROM users WHERE email = $1 OR cpf = $1', [username]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado.' });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Senha Incorreta.' });
      }

      // Gera JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, cargo: user.cargo },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Remove password da resposta por segurança
      delete user.password;

      res.json({ success: true, token, user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async createUser(req: Request, res: Response) {
    if (res.locals.userCargo !== 'Administrador') {
      // Se não houver usuários no banco, permite criar o primeiro admin
      const checkResult = await query('SELECT count(*) FROM users');
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar novos usuários.' });
      }
    }
    const { nome, cpf, email, password, cargo } = req.body;
    try {
      if (!isStrongPassword(password)) {
        return res.status(400).json({ 
          error: 'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, um número e um caractere especial.' 
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(`
        INSERT INTO users (nome, email, cpf, password, cargo) 
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, cpf = EXCLUDED.cpf, nome = EXCLUDED.nome, cargo = EXCLUDED.cargo
      `, [nome, email, cpf, hashedPassword, cargo || 'Usuário']);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async listUsers(req: Request, res: Response) {
    if (res.locals.userCargo !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar usuários.' });
    }
    const { nome, email, cpf } = req.query;
    let sql = 'SELECT id, nome, email, cpf, cargo FROM users WHERE 1=1';
    const params: any[] = [];

    if (nome) {
      params.push(`%${nome}%`);
      sql += ` AND nome ILIKE $${params.length}`;
    }
    if (email) {
      params.push(`%${email}%`);
      sql += ` AND email ILIKE $${params.length}`;
    }
    if (cpf) {
      params.push(`%${cpf}%`);
      sql += ` AND cpf ILIKE $${params.length}`;
    }

    sql += ' ORDER BY nome';
    try {
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async updateUserByAdmin(req: Request, res: Response) {
    if (res.locals.userCargo !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem editar outros usuários.' });
    }
    const { id } = req.params;
    const { nome, email, cpf, cargo } = req.body;
    try {
      await query(`
        UPDATE users 
        SET nome = $1, email = $2, cpf = $3, cargo = $4 
        WHERE id = $5
      `, [nome, email, cpf, cargo, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  async resetUserPassword(req: Request, res: Response) {
    if (res.locals.userCargo !== 'Administrador') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem redefinir senhas.' });
    }
    const { id } = req.params;
    try {
      const defaultPassword = 'Acesso123@';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
      res.json({ success: true, message: `Senha redefinida para: ${defaultPassword}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
