import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'buyer' | 'seller' | 'admin';
export type AuthUser = {id: number; role: Role; name: string; email: string};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SECRET = process.env.JWT_SECRET ?? 'dev-secret';

export const sign = (u: AuthUser) => jwt.sign(u, SECRET, {expiresIn: '30d'});

function read(req: Request): AuthUser | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return;
  try {
    const {id, role, name, email} = jwt.verify(h.slice(7), SECRET) as AuthUser;
    return {id, role, name, email};
  } catch {
    return;
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = read(req);
  next();
}

export function requireAuth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = read(req);
    if (!u) return res.status(401).json({error: 'Please log in'});
    if (roles.length && !roles.includes(u.role)) return res.status(403).json({error: 'Not allowed'});
    req.user = u;
    next();
  };
}
