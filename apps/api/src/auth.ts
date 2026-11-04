import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {one} from './db.js';

export type Role = 'buyer' | 'seller' | 'admin';
export type AuthUser = {id: number; role: Role; name: string; email: string; tv?: number};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SECRET = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-secret');
if (!SECRET) throw new Error('JWT_SECRET must be set in production');

/** The token carries the user's token_version; bumping it (password change, account deletion) signs out every device. */
export const sign = (u: AuthUser, tokenVersion = 0) =>
  jwt.sign({id: u.id, role: u.role, name: u.name, email: u.email, tv: tokenVersion}, SECRET, {expiresIn: '30d'});

async function read(req: Request): Promise<AuthUser | undefined> {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return;
  let t: AuthUser;
  try {
    t = jwt.verify(h.slice(7), SECRET) as AuthUser;
  } catch {
    return;
  }
  const row = await one('SELECT token_version, deleted_at FROM users WHERE id = $1', [t.id]);
  if (!row || row.deleted_at || row.token_version !== (t.tv ?? 0)) return;
  return {id: t.id, role: t.role, name: t.name, email: t.email};
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  read(req).then(u => {
    req.user = u;
    next();
  }, next);
}

export function requireAuth(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    read(req).then(u => {
      if (!u) return res.status(401).json({error: 'Your session has expired. Please log in again.'});
      if (roles.length && !roles.includes(u.role)) return res.status(403).json({error: 'Not allowed'});
      req.user = u;
      next();
    }, next);
  };
}

// ---- Simple fixed-window rate limiter (per instance; enough to stop casual brute force) ----
const hits = new Map<string, {n: number; reset: number}>();

/** Returns true when `key` has exceeded `max` attempts in the current window. */
export function tooMany(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, {n: 1, reset: now + windowMs});
    if (hits.size > 50_000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > max;
}
