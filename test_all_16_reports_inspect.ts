import { initDatabase } from './server/db';
import axios from 'axios';

async function testAllReports() {
  const API_BASE = 'http://localhost:5000/api';

  // Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment: '2IC', password: '2ic123' }),
  });
  const { token } = await loginRes.json();

  const reports = [
    '1_DAILY_MANPOWER',
    '2_DAILY_DUTY',
    '3_WEEKLY_DUTY',
    '4_MONTHLY_DUTY',
    '5_NIGHT_DUTY',
    '6_FATIGUE_INDEX',
    '7_PT_ATTENDANCE',
    '8_GAMES_ATTENDANCE',
    '9_COMBINED_PERFORMANCE',
    '10_CURRENT_LEAVE_STATUS',
    '11_YEARLY_LEAVE_SUMMARY',
    '12_C_LEAVE_DUE',
    '13_C_LEAVE_OVERDUE',
    '14_LEAVE_FORECAST_3M',
    '15_INDIVIDUAL_DOSSIER',
    '16_TRADE_MANPOWER',
  ];

  for (const r of reports) {
    const res = await fetch(`${API_BASE}/reports/generate?reportType=${r}&date=2026-08-28`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    console.log(`[${r}] Status: ${res.status} | Title: "${json.title}" | Keys in data: ${Object.keys(json.data || {}).join(', ')}`);
  }

  process.exit(0);
}

testAllReports();
