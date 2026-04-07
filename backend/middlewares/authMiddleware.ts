import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'ics_segredo_padrao_mudar_em_producao';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (!scheme || !token || scheme !== 'Bearer') {
    return res.status(401).json({ error: 'Formato do token inválido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Adiciona o ID do usuário no res.locals para uso posterior se necessário
    res.locals.userId = decoded.id;
    res.locals.userCargo = decoded.cargo;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token expirado ou inválido' });
  }
};
