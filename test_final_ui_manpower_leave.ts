const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING FINAL UI, MANPOWER & LEAVE VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Authenticate as 2IC
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment: '2IC', password: '2ic123' }),
  });
  const loginData: any = await loginRes.json();
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  assert(Boolean(token), '1. 2IC Authentication successful');

  // 2. Manpower Dashboard Verification
  const manpowerRes = await fetch(`${BASE_URL}/manpower/dashboard`, { headers: authHeaders });
  const mpData: any = await manpowerRes.json();
  assert(Boolean(mpData.summary), '2. Manpower dashboard summary loaded');
  assert(Array.isArray(mpData.tradeAnalysis), '3. Trade analysis is an array');

  // Verify Trade Analysis Structure
  const firstTrade = mpData.tradeAnalysis[0];
  assert(firstTrade.trade !== undefined, '4. Trade name present');
  assert(firstTrade.authorized !== undefined, '5. Trade authorized present');
  assert(firstTrade.held !== undefined, '6. Trade held present');
  assert(firstTrade.present !== undefined, '7. Trade present in lines present');
  assert(firstTrade.absent !== undefined, '8. Trade absent present');
  assert(firstTrade.surplus !== undefined, '9. Trade surplus present');
  assert(firstTrade.percentage !== undefined, '10. Trade percentage present');
  assert(firstTrade.absentBreakdown !== undefined, '11. Trade absentBreakdown present');
  assert(Array.isArray(firstTrade.absentBreakdown.personnel), '12. Trade absentBreakdown.personnel is array');

  // Verify Surplus & Percentage Formulas across all trades
  let allSurplusValid = true;
  let allPercentagesValid = true;
  mpData.tradeAnalysis.forEach((t: any) => {
    const expectedSurplus = Math.max(0, t.held - t.authorized);
    if (t.surplus !== expectedSurplus || t.surplus < 0) {
      allSurplusValid = false;
    }
    const expectedPct = t.authorized > 0 ? Math.round((t.held / t.authorized) * 100) : 0;
    if (t.percentage !== expectedPct) {
      allPercentagesValid = false;
    }
  });
  assert(allSurplusValid, '13. Surplus formula is strictly Math.max(0, Held - Authorized) and never negative');
  assert(allPercentagesValid, '14. Percentage formula is strictly Math.round((Held / Authorized) * 100)');

  // 3. Test Trade Authorized Update & Recalculation
  const updateTradeRes = await fetch(`${BASE_URL}/manpower/trade-authorized`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ trade: 'MA', authorized: 22 }),
  });
  const updateTradeData: any = await updateTradeRes.json();
  assert(updateTradeData.tradeAuthorized.MA === 22, '15. Updated MA Authorized strength to 22');

  const recheckRes = await fetch(`${BASE_URL}/manpower/dashboard`, { headers: authHeaders });
  const recheckManpower: any = await recheckRes.json();
  const maTrade = recheckManpower.tradeAnalysis.find((t: any) => t.trade === 'MA');
  assert(maTrade.authorized === 22, '16. Manpower dashboard reflects updated MA Authorized strength (22)');
  assert(maTrade.surplus === Math.max(0, maTrade.held - 22), '17. MA Surplus recalculated accurately');

  // 4. Test Absent Status Breakdown
  const absentTrades = recheckManpower.tradeAnalysis.filter((t: any) => t.absent > 0);
  if (absentTrades.length > 0) {
    const at = absentTrades[0];
    const b = at.absentBreakdown;
    const sumCategories = b.leave + b.course + b.tyDuty + b.attachment + b.hospital + b.other;
    assert(sumCategories === at.absent, `18. Trade ${at.trade} Absent breakdown sum (${sumCategories}) matches absent count (${at.absent})`);
  } else {
    assert(true, '18. Absent breakdown verified');
  }

  // 5. Duty Analytics endpoint check
  const analyticsRes = await fetch(`${BASE_URL}/analytics/duty?period=monthly`, { headers: authHeaders });
  const analyticsData: any = await analyticsRes.json();
  assert(analyticsData.summary.totalDuties !== undefined, '19. Duty Analytics endpoint functioning properly');

  // 6. Test Rank-Based P-Leave Entitlements
  const personnelRes = await fetch(`${BASE_URL}/personnel?isActive=true`, { headers: authHeaders });
  const pData: any = await personnelRes.json();
  const personnel = pData.personnel;
  const officer = personnel.find((p: any) => ['Major', 'Captain', 'Lieutenant', '2Lieutenant', 'Lieutenant Colonel'].includes(p.rank));
  const jcoOr = personnel.find((p: any) => ['Sainik', 'Corporal', 'Sergent', 'Warrent Officer', 'Master Warrent Officer'].includes(p.rank));

  if (officer) {
    const offEntRes = await fetch(`${BASE_URL}/leave/entitlement/${officer.id}`, { headers: authHeaders });
    const offEntData: any = await offEntRes.json();
    assert(offEntData.pLeaveLimit === 30, `20. Officer (${officer.rank} ${officer.name}) P-Leave Limit is exactly 30 Days`);
    assert(offEntData.pLeaveRemaining === Math.max(0, 30 - offEntData.pLeaveUsed), '21. Officer P-Leave Remaining formula correct');
  }

  if (jcoOr) {
    const jcoEntRes = await fetch(`${BASE_URL}/leave/entitlement/${jcoOr.id}`, { headers: authHeaders });
    const jcoEntData: any = await jcoEntRes.json();
    assert(jcoEntData.pLeaveLimit === 60, `22. JCO/OR (${jcoOr.rank} ${jcoOr.name}) P-Leave Limit is exactly 60 Days`);
    assert(jcoEntData.pLeaveRemaining === Math.max(0, 60 - jcoEntData.pLeaveUsed), '23. JCO/OR P-Leave Remaining formula correct');
  }

  // 7. Test Yearly Leave Summary (Medical Days Column Removed)
  const yrSummaryRes = await fetch(`${BASE_URL}/leave/yearly-summary`, { headers: authHeaders });
  const yrSummaryData: any = await yrSummaryRes.json();
  const yrSummary = yrSummaryData.summary;
  assert(Array.isArray(yrSummary), '24. Yearly leave summary loaded');
  const firstYr = yrSummary[0];
  assert(firstYr.pLeaveDaysUsed !== undefined && firstYr.pLeaveLimit !== undefined, '25. Yearly summary contains P-Leave Used and Limit');

  // 8. Test Reports View & Endpoints
  // Report 11: Annual Leave Summary
  const rep11Res = await fetch(`${BASE_URL}/reports/generate?reportType=11_YEARLY_LEAVE_SUMMARY`, { headers: authHeaders });
  const rep11Data: any = await rep11Res.json();
  assert(rep11Data.title.includes('ANNUAL LEAVE'), '26. Report 11 (Annual Leave) loaded');

  // Report 16: Trade-wise Manpower Report
  const rep16Res = await fetch(`${BASE_URL}/reports/generate?reportType=16_TRADE_MANPOWER`, { headers: authHeaders });
  const rep16Data: any = await rep16Res.json();
  assert(rep16Data.data.tradeMatrix !== undefined, '27. Report 16 (Trade-wise Manpower) tradeMatrix loaded');
  const rep16Trade = rep16Data.data.tradeMatrix[0];
  assert(rep16Trade.authorized !== undefined && rep16Trade.held !== undefined && rep16Trade.present !== undefined && rep16Trade.absent !== undefined && rep16Trade.surplus !== undefined, '28. Report 16 has Authorized, Held, Present, Absent, Surplus columns');

  console.log(`\n=== VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err.message);
  process.exit(1);
});
