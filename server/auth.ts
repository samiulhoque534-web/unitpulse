import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { AppointmentRole } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'unitpulse_55_fd_amb_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    appointment: AppointmentRole;
    displayName: string;
  };
}

export function generateToken(user: { id: string; appointment: AppointmentRole; displayName: string }) {
  return jwt.sign(
    { id: user.id, appointment: user.appointment, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }
  const [salt, key] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === key;
}

export function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}

// Strict Role and Permission Guard
export function requirePermission(allowedAppointments: AppointmentRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    // CO is strictly read-only: Block any modifying HTTP methods
    if (req.user.appointment === 'CO' && req.method !== 'GET') {
      return res.status(403).json({
        error: 'Permission Denied: Commanding Officer account has strict read-only oversight access.',
      });
    }

    if (!allowedAppointments.includes(req.user.appointment)) {
      return res.status(403).json({
        error: `Permission Denied: Appointment '${req.user.appointment}' is not authorized for this operation.`,
      });
    }

    next();
  };
}

// Audit Logger
export function logAudit(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId: string | undefined,
  details: string
) {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();
  const appointment = req.user?.appointment || 'SYSTEM';
  const userDisplayName = req.user?.displayName || 'System Admin';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

  db.prepare(`
    INSERT INTO audit_logs (id, appointment, user_display_name, action, entity_type, entity_id, details, timestamp, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, appointment, userDisplayName, action, entityType, entityId || null, details, timestamp, ipAddress);
}
