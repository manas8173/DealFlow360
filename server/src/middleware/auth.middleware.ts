import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ── JWT Secret ────────────────────────────────────────────────────────────────
// In production, JWT_SECRET must be set as an environment variable.
// We warn loudly if it's missing rather than crashing, to keep the dev experience smooth.
const JWT_SECRET = process.env.JWT_SECRET || 'dealflow360_hackathon_jwt_secret_key_2026';

if (!process.env.JWT_SECRET) {
  console.warn(
    '[SECURITY WARNING] JWT_SECRET environment variable is not set. ' +
    'Using default insecure fallback key. Set JWT_SECRET before deploying to production.'
  );
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  customerId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerId: user.customerId || null,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required',
      },
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired authentication token',
        },
      });
    }

    req.user = decoded as AuthenticatedUser;
    next();
  });
}

export function requireRoles(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: Requires one of roles [${roles.join(', ')}]`,
        },
      });
    }

    next();
  };
}

export function verifyCustomerIsolation(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  if (req.user.role === 'CUSTOMER') {
    if (!req.user.customerId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Customer account missing associated customer ID' } });
    }
  }

  next();
}
