import { Router } from 'express';
import { db } from '../db';
import { generateToken, verifyPassword, hashPassword, authenticateUser, logAudit, AuthRequest } from '../auth';

export const authRouter = Router();

// Login by Appointment
authRouter.post('/login', (req, res) => {
  const { appointment, password } = req.body;

  if (!appointment || !password) {
    return res.status(400).json({ error: 'Appointment and Password are required.' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE appointment = ?').get(appointment);

  if (!user) {
    return res.status(404).json({ error: 'Appointment account not found.' });
  }

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid password for appointment account.' });
  }

  const token = generateToken({
    id: user.id,
    appointment: user.appointment,
    displayName: user.display_name,
  });

  const authReq = req as AuthRequest;
  authReq.user = { id: user.id, appointment: user.appointment, displayName: user.display_name };
  logAudit(authReq, 'LOGIN', 'USER', user.id, `User logged in under appointment ${user.appointment}`);

  return res.json({
    token,
    user: {
      id: user.id,
      appointment: user.appointment,
      displayName: user.display_name,
      role: user.appointment,
    },
  });
});

// Get Current User Profile
authRouter.get('/me', authenticateUser, (req: AuthRequest, res) => {
  const user: any = db.prepare('SELECT id, appointment, display_name, created_at, updated_at FROM users WHERE id = ?').get(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'User session not found.' });
  }

  return res.json({
    user: {
      id: user.id,
      appointment: user.appointment,
      displayName: user.display_name,
      role: user.appointment,
    },
  });
});

// Change Password from Inside Application
authRouter.post('/change-password', authenticateUser, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id);
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password does not match.' });
  }

  const newHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, user.id);

  logAudit(req, 'PASSWORD_CHANGE', 'USER', user.id, `Password changed for appointment ${user.appointment}`);

  return res.json({ message: 'Password updated successfully.' });
});

// List all appointment descriptions
authRouter.get('/appointments', (req, res) => {
  return res.json({
    appointments: [
      { role: 'CO', title: 'Commanding Officer (CO)', desc: 'Executive Command & Full Visibility (Strictly Read-Only)' },
      { role: '2IC', title: 'Second-in-Command (2IC)', desc: 'Full Personnel, Manpower, Duty & Leave Management' },
      { role: 'DUTY_OFFICER', title: 'Duty Officer', desc: 'Daily Duty Roster & PT/Games Attendance Management' },
      { role: 'DUTY_MUNSHI', title: 'Duty Munshi', desc: 'Daily Administrative Records, Attendance & Leave Entry' },
    ],
  });
});
