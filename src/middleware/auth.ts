import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Tipagem do payload esperado no token
interface DecodedToken extends JwtPayload {
  userId: number;
  name: string;
  email: string;
}

// Request extendida para incluir user tipado
interface AuthRequest extends Request {
  user?: DecodedToken;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers;
  const token = authHeader?.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' }); 
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Aqui garantimos que o decoded tem a tipagem correta
    req.user = decoded as DecodedToken;

    // Log para debug (remova em produção)
    console.log('Usuário autenticado:', req.user);

    next();
  });
}
