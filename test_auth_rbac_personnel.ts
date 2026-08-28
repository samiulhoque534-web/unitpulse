const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('TESTING UNITPULSE AUTHENTICATION, RBAC & PERSONNEL');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Test Login with All Roles
  console.log('--- 1. Testing Login with All Roles ---');
  let coToken = '';
  let twoIcToken = '';
  let doToken = '';
  let dmToken = '';

  try {
    const resCO = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: 'CO', password: 'co123' }),
    });
    const dataCO = await resCO.json();
    coToken = dataCO.token;
    assert(resCO.status === 200 && dataCO.user.appointment === 'CO', 'CO Login Successful');
  } catch (e: any) {
    assert(false, `CO Login Failed: ${e.message}`);
  }

  try {
    const res2IC = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: '2IC', password: '2ic123' }),
    });
    const data2IC = await res2IC.json();
    twoIcToken = data2IC.token;
    assert(res2IC.status === 200 && data2IC.user.appointment === '2IC', '2IC Login Successful');
  } catch (e: any) {
    assert(false, `2IC Login Failed: ${e.message}`);
  }

  try {
    const resDO = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: 'DUTY_OFFICER', password: 'do123' }),
    });
    const dataDO = await resDO.json();
    doToken = dataDO.token;
    assert(resDO.status === 200 && dataDO.user.appointment === 'DUTY_OFFICER', 'DUTY_OFFICER Login Successful');
  } catch (e: any) {
    assert(false, `DUTY_OFFICER Login Failed: ${e.message}`);
  }

  try {
    const resDM = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: 'DUTY_MUNSHI', password: 'dm123' }),
    });
    const dataDM = await resDM.json();
    dmToken = dataDM.token;
    assert(resDM.status === 200 && dataDM.user.appointment === 'DUTY_MUNSHI', 'DUTY_MUNSHI Login Successful');
  } catch (e: any) {
    assert(false, `DUTY_MUNSHI Login Failed: ${e.message}`);
  }

  // 2. Test CO Strict Read-Only RBAC (Must reject mutating requests with 403)
  console.log('\n--- 2. Testing CO Strict Read-Only Access (403 Forbidden) ---');
  const coHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${coToken}`,
  };

  try {
    const res = await fetch(`${API_BASE}/personnel`, {
      method: 'POST',
      headers: coHeaders,
      body: JSON.stringify({ armyNumber: 'NO-999001', rank: 'Sainik', name: 'CO Test Add', trade: 'MA' }),
    });
    const data = await res.json();
    assert(res.status === 403, `CO blocked from adding personnel (403 Forbidden: ${data.error})`);
  } catch (e: any) {
    assert(false, `CO check error: ${e.message}`);
  }

  try {
    const res = await fetch(`${API_BASE}/manpower/authorized`, {
      method: 'PUT',
      headers: coHeaders,
      body: JSON.stringify({ authorized: 135 }),
    });
    const data = await res.json();
    assert(res.status === 403, `CO blocked from editing authorized manpower (403 Forbidden: ${data.error})`);
  } catch (e: any) {
    assert(false, `CO check error: ${e.message}`);
  }

  try {
    const res = await fetch(`${API_BASE}/duties`, {
      method: 'POST',
      headers: coHeaders,
      body: JSON.stringify({ date: '2026-08-28', personnelId: 'dummy', dutyType: 'Kote Duty', startTime: '06:00', endTime: '08:00' }),
    });
    assert(res.status === 403, `CO blocked from assigning duties (403 Forbidden)`);
  } catch (e: any) {
    assert(false, `CO check error: ${e.message}`);
  }

  // 3. Test Personnel Creation with NC(E) and Civil Ranks
  console.log('\n--- 3. Testing Personnel Creation with NC(E) and Civil Ranks ---');
  const twoIcHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${twoIcToken}`,
  };
  let testSoldierId = '';
  let nceSoldierId = '';

  const testArmyNo1 = `TEST-NCE-${Date.now().toString().slice(-4)}`;
  const testArmyNo2 = `TEST-CIV-${Date.now().toString().slice(-4)}`;

  try {
    const resNCE = await fetch(`${API_BASE}/personnel`, {
      method: 'POST',
      headers: twoIcHeaders,
      body: JSON.stringify({
        armyNumber: testArmyNo1,
        rank: 'NC(E)',
        name: 'Abdul Kashem',
        trade: 'Cook',
        appointment: 'Mess Cook',
      }),
    });
    const dataNCE = await resNCE.json();
    nceSoldierId = dataNCE.id;
    assert(resNCE.status === 201, `Created personnel with rank 'NC(E)': ${testArmyNo1}`);
  } catch (e: any) {
    assert(false, `Failed to create NC(E) personnel: ${e.message}`);
  }

  try {
    const resCivil = await fetch(`${API_BASE}/personnel`, {
      method: 'POST',
      headers: twoIcHeaders,
      body: JSON.stringify({
        armyNumber: testArmyNo2,
        rank: 'Civil',
        name: 'Kamal Hossain',
        trade: 'Tradesman',
        appointment: 'Civilian Staff',
      }),
    });
    const dataCivil = await resCivil.json();
    testSoldierId = dataCivil.id;
    assert(resCivil.status === 201, `Created personnel with rank 'Civil': ${testArmyNo2}`);
  } catch (e: any) {
    assert(false, `Failed to create Civil personnel: ${e.message}`);
  }

  // 4. Test Editing Personnel (Army Number, Rank, Name, Trade, Appointment)
  console.log('\n--- 4. Testing Editing Personnel & Army Number ---');
  const doHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${doToken}`,
  };
  const updatedArmyNo = `CIV-EDIT-${Date.now().toString().slice(-4)}`;

  try {
    const resEdit = await fetch(`${API_BASE}/personnel/${testSoldierId}`, {
      method: 'PUT',
      headers: doHeaders,
      body: JSON.stringify({
        armyNumber: updatedArmyNo,
        rank: 'Civil',
        name: 'Kamal Hossain (Updated)',
        trade: 'Tradesman',
        appointment: 'Senior Civilian Staff',
      }),
    });
    assert(resEdit.status === 200, `Duty Officer edited soldier and updated Army Number to '${updatedArmyNo}'`);

    // Verify update
    const resCheck = await fetch(`${API_BASE}/personnel/${testSoldierId}`, { headers: twoIcHeaders });
    const dataCheck = await resCheck.json();
    assert(
      dataCheck.soldier.armyNumber === updatedArmyNo && dataCheck.soldier.name === 'Kamal Hossain (Updated)',
      'Verified updated Army Number and particulars persisted correctly in database'
    );
  } catch (e: any) {
    assert(false, `Failed to edit personnel: ${e.message}`);
  }

  // 5. Test Safe Deletion of Personnel
  console.log('\n--- 5. Testing Safe Deletion of Personnel ---');
  const dmHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${dmToken}`,
  };

  try {
    const resDel = await fetch(`${API_BASE}/personnel/${testSoldierId}`, {
      method: 'DELETE',
      headers: dmHeaders,
    });
    const dataDel = await resDel.json();
    assert(resDel.status === 200 && dataDel.safeDeleted === true, `Duty Munshi safely deleted soldier: ${dataDel.message}`);

    // Verify soldier is excluded from active list
    const resActiveList = await fetch(`${API_BASE}/personnel?isActive=true`, { headers: twoIcHeaders });
    const dataActive = await resActiveList.json();
    const inActive = dataActive.personnel.some((p: any) => p.id === testSoldierId);
    assert(!inActive, 'Soldier is cleanly removed from Active Personnel Database');

    // Verify soldier exists in deactivated/historical list
    const resDeactivatedList = await fetch(`${API_BASE}/personnel?isActive=false`, { headers: twoIcHeaders });
    const dataDeact = await resDeactivatedList.json();
    const inDeactivated = dataDeact.personnel.some((p: any) => p.id === testSoldierId);
    assert(inDeactivated, 'Soldier preserved in Deactivated / Historical records with full audit trail');
  } catch (e: any) {
    assert(false, `Safe deletion failed: ${e.message}`);
  }

  // 6. Test Password Change Functionality
  console.log('\n--- 6. Testing Password Change & Immediate Invalidation of Old Password ---');
  try {
    // 2IC changes password
    const resChange = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: twoIcHeaders,
      body: JSON.stringify({ currentPassword: '2ic123', newPassword: 'new2icpassword2026' }),
    });
    assert(resChange.status === 200, 'Password changed successfully for 2IC');

    // Attempt login with OLD password -> Must fail
    const resOldLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: '2IC', password: '2ic123' }),
    });
    assert(resOldLogin.status === 401, 'Old password was immediately rejected (401 Unauthorized)');

    // Attempt login with NEW password -> Must succeed
    const resNewLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointment: '2IC', password: 'new2icpassword2026' }),
    });
    const dataNewLogin = await resNewLogin.json();
    assert(resNewLogin.status === 200, 'Login with new password succeeded');

    // Revert back to 2ic123 for standard seed compatibility
    const newHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${dataNewLogin.token}`,
    };
    await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: newHeaders,
      body: JSON.stringify({ currentPassword: 'new2icpassword2026', newPassword: '2ic123' }),
    });
    console.log('Restored 2IC password to 2ic123 for consistency.');
  } catch (e: any) {
    assert(false, `Password change test failed: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runTests().catch(console.error);
