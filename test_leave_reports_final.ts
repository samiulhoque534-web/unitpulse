const API_BASE = 'http://localhost:5000/api';

async function req(url: string, options: any = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('UNITPULSE FINAL VERIFICATION TEST SUITE');
  console.log('Unit: 55 Fd Amb (10 Inf Div)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Authenticate All 4 Roles
  console.log('--- 1. AUTHENTICATING ROLES ---');
  let coToken = '';
  let ic2Token = '';
  let doToken = '';
  let dmToken = '';

  try {
    const coRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ appointment: 'CO', password: 'co123' }) });
    coToken = coRes.data.token;
    assert(coRes.data.user?.appointment === 'CO', 'CO Login Success');

    const ic2Res = await req('/auth/login', { method: 'POST', body: JSON.stringify({ appointment: '2IC', password: '2ic123' }) });
    ic2Token = ic2Res.data.token;
    assert(ic2Res.data.user?.appointment === '2IC', '2IC Login Success');

    const doRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ appointment: 'DUTY_OFFICER', password: 'do123' }) });
    doToken = doRes.data.token;
    assert(doRes.data.user?.appointment === 'DUTY_OFFICER', 'Duty Officer Login Success');

    const dmRes = await req('/auth/login', { method: 'POST', body: JSON.stringify({ appointment: 'DUTY_MUNSHI', password: 'dm123' }) });
    dmToken = dmRes.data.token;
    assert(dmRes.data.user?.appointment === 'DUTY_MUNSHI', 'Duty Munshi Login Success');
  } catch (err: any) {
    assert(false, 'Auth Failed', err.message);
  }

  // 2. Test CO Read-Only Restrictions vs 2IC/DO/DM Full Operational Control
  console.log('\n--- 2. ROLE-BASED ACCESS CONTROL (CO READ-ONLY vs 2IC/DO/DM FULL CONTROL) ---');

  // Fetch a soldier
  const pRes = await req('/personnel', { headers: { Authorization: `Bearer ${coToken}` } });
  const testSoldier = pRes.data.personnel[0];
  assert(pRes.data.personnel.length > 0, 'CO Can View Personnel Database');

  // CO should be blocked from sanctioning leave
  const coSanctionRes = await req('/leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coToken}` },
    body: JSON.stringify({
      personnelId: testSoldier.id,
      leaveType: 'C_LEAVE',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      reason: 'Unauthorized test',
    }),
  });
  assert(coSanctionRes.status === 403, 'CO Blocked from Sanctioning Leave (403 Forbidden)');

  // 2IC Sanctions Leave
  let testLeaveId = '';
  const sRes = await req('/leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ic2Token}` },
    body: JSON.stringify({
      personnelId: testSoldier.id,
      leaveType: 'C_LEAVE',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      reason: 'Authorized 2IC Sanction Test',
      forceOverride: true,
    }),
  });
  testLeaveId = sRes.data.id;
  assert(Boolean(testLeaveId), '2IC Can Sanction Leave');

  // Duty Officer Edits Leave
  const editRes = await req(`/leave/${testLeaveId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doToken}` },
    body: JSON.stringify({
      leaveType: 'C_LEAVE',
      startDate: '2026-09-02',
      endDate: '2026-09-08',
      reason: 'Updated by Duty Officer',
      totalDays: 7,
    }),
  });
  assert(editRes.status === 200, 'Duty Officer Can Edit Leave Record');

  // CO should be blocked from deleting leave
  const coDelRes = await req(`/leave/${testLeaveId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${coToken}` },
  });
  assert(coDelRes.status === 403, 'CO Blocked from Deleting Leave (403 Forbidden)');

  // Duty Munshi Deletes Leave Record
  const dmDelRes = await req(`/leave/${testLeaveId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${dmToken}` },
  });
  assert(dmDelRes.status === 200 && dmDelRes.data.deletedId === testLeaveId, 'Duty Munshi Can Delete Leave Record');

  // 3. Test 3 Months Register & Reminders Endpoints
  console.log('\n--- 3. 3 MONTHS REGISTER & REMINDERS ---');
  const remRes = await req('/leave/reminders', { headers: { Authorization: `Bearer ${coToken}` } });
  assert(remRes.data.counts !== undefined, 'Leave Reminders Retrieved (Due in 15 Days & Overdue)');

  const fcRes = await req('/leave/forecast-3m', { headers: { Authorization: `Bearer ${coToken}` } });
  assert(fcRes.data.forecast.length === 3, '3-Month Forward Forecast (Month 1, 2, 3) Generated');
  assert(fcRes.data.registerEntries.length > 0, '3 Months Register Roll Populated');

  // 4. Test All 16 Military Reports
  console.log('\n--- 4. AUDITING ALL 16 OFFICIAL MILITARY REPORTS ---');
  const reportTypes = [
    { id: '1_DAILY_MANPOWER', name: 'Report 01: Daily Manpower Report' },
    { id: '2_DAILY_DUTY', name: 'Report 02: Daily Duty Roster' },
    { id: '3_WEEKLY_DUTY', name: 'Report 03: Weekly Duty Analysis' },
    { id: '4_MONTHLY_DUTY', name: 'Report 04: Monthly Duty Analysis' },
    { id: '5_NIGHT_DUTY', name: 'Report 05: Night Duty (22:00-06:00)' },
    { id: '6_FATIGUE_INDEX', name: 'Report 06: Fatigue Index & Workload' },
    { id: '7_PT_ATTENDANCE', name: 'Report 07: PT Attendance Report' },
    { id: '8_GAMES_ATTENDANCE', name: 'Report 08: Games Attendance Report' },
    { id: '9_COMBINED_PERFORMANCE', name: 'Report 09: Combined Duty/PT/Games' },
    { id: '10_CURRENT_LEAVE_STATUS', name: 'Report 10: Current Leave Status' },
    { id: '11_YEARLY_LEAVE_SUMMARY', name: 'Report 11: Annual Leave Summary' },
    { id: '12_C_LEAVE_DUE', name: 'Report 12: C Leave Due in 15 Days' },
    { id: '13_C_LEAVE_OVERDUE', name: 'Report 13: C Leave Overdue Roll' },
    { id: '14_LEAVE_FORECAST_3M', name: 'Report 14: 3-Month Forward Forecast' },
    { id: '15_INDIVIDUAL_DOSSIER', name: 'Report 15: Individual Confidential Dossier' },
    { id: '16_TRADE_MANPOWER', name: 'Report 16: Trade-wise Master Manpower' },
  ];

  for (const r of reportTypes) {
    const repRes = await req(`/reports/generate?reportType=${r.id}&personnelId=${testSoldier.id}`, {
      headers: { Authorization: `Bearer ${coToken}` },
    });
    const title = repRes.data.title;
    const meta = repRes.data.metadata;
    const d = repRes.data.data;

    assert(
      Boolean(title && meta && d),
      `${r.name}`,
      `Title: ${title}, Unit: ${meta?.unitName}`
    );
  }

  // Report Specific Math Validations
  console.log('\n--- 5. REPORT LOGIC & MATHEMATICAL ACCURACY ---');
  // Report 1: Surplus and percentage
  const rep1 = (await req('/reports/generate?reportType=1_DAILY_MANPOWER', { headers: { Authorization: `Bearer ${coToken}` } })).data;
  const sc = rep1.data.statusCounts;
  assert(sc.surplus === Math.max(0, sc.held - sc.authorized), 'Report 01: Surplus = max(Held - Authorized, 0)');
  assert(sc.percentage === Math.round((sc.held / sc.authorized) * 100), 'Report 01: Percentage = (Held / Authorized) * 100');

  // Report 16: Trade table
  const rep16 = (await req('/reports/generate?reportType=16_TRADE_MANPOWER', { headers: { Authorization: `Bearer ${coToken}` } })).data;
  const tm = rep16.data.tradeMatrix;
  assert(tm.length === 13, 'Report 16: Contains all 13 unit trades');
  assert(tm[0].surplus !== undefined && tm[0].percentage !== undefined, 'Report 16: Surplus & Percentage columns valid');

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
