import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './db';
import { seedDatabase } from './seed';

import { authRouter } from './routes/auth';
import { personnelRouter } from './routes/personnel';
import { manpowerRouter } from './routes/manpower';
import { dutyRouter } from './routes/duties';
import { ptRouter } from './routes/pt';
import { gamesRouter } from './routes/games';
import { leaveRouter, syncLeaveStatusWithPersonnel } from './routes/leave';
import { analyticsRouter } from './routes/analytics';
import { reportsRouter } from './routes/reports';
import { auditRouter } from './routes/audit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'UNITPULSE',
    unit: '55 Fd Amb (10 Inf Div)',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/personnel', personnelRouter);
app.use('/api/manpower', manpowerRouter);
app.use('/api/duties', dutyRouter);
app.use('/api/pt', ptRouter);
app.use('/api/games', gamesRouter);
app.use('/api/leave', leaveRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

// Reset / Re-seed Endpoint
app.post('/api/admin/reseed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'UnitPulse database re-seeded successfully for 55 Fd Amb (10 Inf Div).' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static build in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize and Start Server
async function startServer() {
  console.log('[UnitPulse] Initializing database...');
  await initDatabase();

  // Check if users exist; if not, seed
  try {
    const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!userCount || userCount.count === 0) {
      console.log('[UnitPulse] First-time setup detected. Seeding 55 Fd Amb data...');
      await seedDatabase();
    }
  } catch (e) {
    console.log('[UnitPulse] Seeding fresh database...');
    await seedDatabase();
  // Synchronize leave status with personnel database
  console.log('[UnitPulse] Synchronizing leave records with personnel database...');
  syncLeaveStatusWithPersonnel();

  app.listen(PORT, () => {
    console.log('=======================================================');
    console.log('  UNITPULSE - 55 Fd Amb (10 Inf Div)');
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log('=======================================================');
  });
}

startServer();
