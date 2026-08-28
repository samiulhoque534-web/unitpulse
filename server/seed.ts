import { initDatabase, db } from './db';
import { hashPassword } from './auth';
import { format, subDays, addDays } from 'date-fns';
import { DEFAULT_TRADE_AUTHORIZED } from '../src/utils/constants';

export async function seedDatabase() {
  await initDatabase();

  // Clear existing UnitPulse tables
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM leave_records;
    DELETE FROM games_records;
    DELETE FROM pt_records;
    DELETE FROM duties;
    DELETE FROM personnel;
    DELETE FROM users;
    DELETE FROM settings;
  `);

  console.log('[UnitPulse] Seeding database for 55 Fd Amb (10 Inf Div)...');

  // 1. Seed 4 Appointment Accounts
  const users = [
    { appointment: 'CO', displayName: 'Commanding Officer (CO)', password: 'co123' },
    { appointment: '2IC', displayName: 'Second-in-Command (2IC)', password: '2ic123' },
    { appointment: 'DUTY_OFFICER', displayName: 'Duty Officer', password: 'do123' },
    { appointment: 'DUTY_MUNSHI', displayName: 'Duty Munshi', password: 'dm123' },
  ];

  const now = new Date().toISOString();

  users.forEach((u, i) => {
    db.prepare(`
      INSERT INTO users (id, appointment, display_name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`usr_${i + 1}`, u.appointment, u.displayName, hashPassword(u.password), now, now);
  });

  // 2. Settings (Authorized Manpower configuration & Trade-wise Authorized Map)
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)`).run(
    'authorized_manpower',
    '120',
    now
  );

  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)`).run(
    'trade_authorized_map',
    JSON.stringify(DEFAULT_TRADE_AUTHORIZED),
    now
  );

  // 3. Seed Realistic Personnel for 55 Fd Amb (10 Inf Div) (Strictly Army Number, Rank, Name, Trade, Appointment, Status)
  const personnelSeedData = [
    // Officers
    { armyNumber: 'BA-7124', rank: 'Lieutenant Colonel', name: 'Md. Tariqul Islam', trade: 'Offr', appointment: 'Commanding Officer', status: 'PRESENT' },
    { armyNumber: 'BA-8452', rank: 'Major', name: 'Kazi Ashraful Haque', trade: 'Offr', appointment: '2IC', status: 'PRESENT' },
    { armyNumber: 'BA-9831', rank: 'Captain', name: 'Dr. Mahmudul Hasan', trade: 'Offr', appointment: 'Regimental Medical Officer', status: 'PRESENT' },
    { armyNumber: 'BA-10214', rank: 'Captain', name: 'Dr. Tanvir Ahmed', trade: 'Offr', appointment: 'Medical Officer (Triage)', status: 'PRESENT' },
    { armyNumber: 'BA-11055', rank: 'Lieutenant', name: 'Dr. Fahim Shahriar', trade: 'Offr', appointment: 'Medical Officer (Ward)', status: 'PRESENT' },
    { armyNumber: 'BA-11420', rank: '2Lieutenant', name: 'Sajid Al-Amin', trade: 'Offr', appointment: 'Adjutant / Admin Offr', status: 'PRESENT' },

    // Junior Commissioned Officers (JCOs)
    { armyNumber: 'BJO-34102', rank: 'Master Warrent Officer', name: 'Md. Nurul Islam', trade: 'MA', appointment: 'Subedar Major (SM)', status: 'PRESENT' },
    { armyNumber: 'BJO-38914', rank: 'Senior Warrent Officer', name: 'Md. Delwar Hossain', trade: 'Clerk', appointment: 'Chief Head Clerk', status: 'PRESENT' },
    { armyNumber: 'BJO-41205', rank: 'Senior Warrent Officer', name: 'Md. Abdul Mannan', trade: 'Dispenser', appointment: 'Senior Dispenser JCO', status: 'PRESENT' },
    { armyNumber: 'BJO-44581', rank: 'Warrent Officer', name: 'Md. Shah Alam', trade: 'MT', appointment: 'MT JCO', status: 'PRESENT' },
    { armyNumber: 'BJO-46219', rank: 'Warrent Officer', name: 'Md. Golam Rabbani', trade: 'Lab Tech', appointment: 'Chief Laboratory Tech', status: 'PRESENT' },

    // Sergeants
    { armyNumber: 'No-1428514', rank: 'Sergent', name: 'Md. Mizanur Rahman', trade: 'Clerk', appointment: 'Duty Munshi / CHM', status: 'PRESENT' },
    { armyNumber: 'No-1429812', rank: 'Sergent', name: 'Md. Shamim Reza', trade: 'MA', appointment: 'IC MI Room', status: 'PRESENT' },
    { armyNumber: 'No-1430114', rank: 'Sergent', name: 'Md. Zahidul Islam', trade: 'OTA', appointment: 'Operation Theater IC', status: 'PRESENT' },
    { armyNumber: 'No-1431205', rank: 'Sergent', name: 'Md. Anisur Rahman', trade: 'Dispenser', appointment: 'Pharmacy Supervisor', status: 'PRESENT' },
    { armyNumber: 'No-1432418', rank: 'Sergent', name: 'Md. Harun-ur-Rashid', trade: 'SMT', appointment: 'Ambulance Fleet Supervisor', status: 'PRESENT' },

    // Corporals
    { armyNumber: 'No-1440125', rank: 'Corporal', name: 'Md. Rafiqul Islam', trade: 'MA', appointment: 'Emergency Ward NCO', status: 'PRESENT' },
    { armyNumber: 'No-1441582', rank: 'Corporal', name: 'Md. Al-Amin Hossain', trade: 'MA', appointment: 'Triage Orderly', status: 'PRESENT' },
    { armyNumber: 'No-1442301', rank: 'Corporal', name: 'Md. Mostafa Kamal', trade: 'MT', appointment: 'Ambulance Driver', status: 'PRESENT' },
    { armyNumber: 'No-1443119', rank: 'Corporal', name: 'Md. Kamrul Hasan', trade: 'Cook', appointment: 'Mess In-Charge', status: 'PRESENT' },
    { armyNumber: 'No-1444502', rank: 'Corporal', name: 'Md. Nazrul Islam', trade: 'EME', appointment: 'Vehicle Mechanic NCO', status: 'PRESENT' },
    { armyNumber: 'No-1445890', rank: 'Corporal', name: 'Md. Ziaur Rahman', trade: 'Clerk', appointment: 'Admin Clerk', status: 'PRESENT' },

    // Lance Corporals
    { armyNumber: 'No-1450214', rank: 'Lance Corporal', name: 'Md. Jahangir Alam', trade: 'MA', appointment: 'Nursing Assistant', status: 'PRESENT' },
    { armyNumber: 'No-1451325', rank: 'Lance Corporal', name: 'Md. Monir Hossain', trade: 'MT', appointment: 'Ambulance Driver', status: 'PRESENT' },
    { armyNumber: 'No-1452436', rank: 'Lance Corporal', name: 'Md. Faruk Ahmed', trade: 'Lab Tech', appointment: 'Lab Assistant', status: 'PRESENT' },
    { armyNumber: 'No-1453547', rank: 'Lance Corporal', name: 'Md. Saiful Islam', trade: 'Tradesman', appointment: 'Pioneer Handyman', status: 'PRESENT' },
    { armyNumber: 'No-1454658', rank: 'Lance Corporal', name: 'Md. Alamgir Hossain', trade: 'Cook', appointment: 'Special Cook', status: 'PRESENT' },

    // Sainiks (Privates) - Organic Held Strength
    { armyNumber: 'No-1460101', rank: 'Sainik', name: 'Md. Rasel Mia', trade: 'MA', appointment: 'Nursing Orderly', status: 'PRESENT' },
    { armyNumber: 'No-1460205', rank: 'Sainik', name: 'Md. Arif Hossain', trade: 'MA', appointment: 'MI Room Orderly', status: 'PRESENT' },
    { armyNumber: 'No-1460312', rank: 'Sainik', name: 'Md. Shakil Ahmed', trade: 'MA', appointment: 'Ambulance Attendant / 2nd Seater', status: 'PRESENT' },
    { armyNumber: 'No-1460420', rank: 'Sainik', name: 'Md. Rubel Hossain', trade: 'MA', appointment: 'Field Medic', status: 'PRESENT' },
    { armyNumber: 'No-1460555', rank: 'Sainik', name: 'Md. Sumon Ali', trade: 'MT', appointment: 'Field Ambulance Driver', status: 'PRESENT' },
    { armyNumber: 'No-1460618', rank: 'Sainik', name: 'Md. Biplob Hossain', trade: 'MT', appointment: 'Troop Carrier Driver', status: 'PRESENT' },
    { armyNumber: 'No-1460729', rank: 'Sainik', name: 'Md. Mehedi Hasan', trade: 'MT', appointment: 'Command Jeep Driver', status: 'PRESENT' },
    { armyNumber: 'No-1460833', rank: 'Sainik', name: 'Md. Imran Hossain', trade: 'Cook', appointment: 'Unit Cook', status: 'PRESENT' },
    { armyNumber: 'No-1460945', rank: 'Sainik', name: 'Md. Shahin Alam', trade: 'Cook', appointment: 'Unit Cook', status: 'PRESENT' },
    { armyNumber: 'No-1461011', rank: 'Sainik', name: 'Md. Kabir Hossain', trade: 'NC(E)', appointment: 'Conservancy Staff', status: 'PRESENT' },
    { armyNumber: 'No-1461122', rank: 'Sainik', name: 'Md. Jewel Rana', trade: 'NC(E)', appointment: 'Sanitary Orderly', status: 'PRESENT' },
    { armyNumber: 'No-1461234', rank: 'Sainik', name: 'Md. Asadul Islam', trade: 'NCU', appointment: 'Water Carrier', status: 'PRESENT' },

    // Away Personnel (Testing Manpower Absences & Strict PT/Games Exclusions)
    { armyNumber: 'No-1461345', rank: 'Sainik', name: 'Md. Shafiqul Islam', trade: 'MT', appointment: 'Driver', status: 'TY_DUTY', reason: 'Temporary Duty with Div HQ Supply Convoy' },
    { armyNumber: 'No-1461456', rank: 'Sainik', name: 'Md. Aminul Islam', trade: 'MA', appointment: 'Medic', status: 'ATTACHMENT', reason: 'Attached to 10 Inf Div Field Hospital' },
    { armyNumber: 'No-1461567', rank: 'Sainik', name: 'Md. Habibur Rahman', trade: 'Cook', appointment: 'Cook', status: 'LEAVE', reason: 'Privilege Leave (P-Leave) until 15 Sep' },
    { armyNumber: 'No-1461678', rank: 'Sainik', name: 'Md. Rony Mia', trade: 'MA', appointment: 'Nursing Orderly', status: 'LEAVE', reason: 'Casual Leave (C-Leave) until 28 Aug' },
    { armyNumber: 'No-1461789', rank: 'Sainik', name: 'Md. Tariqul Islam Jr', trade: 'SMT', appointment: 'Vehicle Mechanic', status: 'LEAVE', reason: 'Medical Leave (CMH Savar)' },
    { armyNumber: 'No-1461890', rank: 'Sainik', name: 'Md. Belal Hossain', trade: 'Tradesman', appointment: 'Carpenter', status: 'OTHER', reason: 'Course: Advanced Combat Lifesaver at AFMSD' },
  ];

  const personnelIds: Record<string, string> = {};

  personnelSeedData.forEach((p, idx) => {
    const id = `p_${idx + 1}`;
    personnelIds[p.armyNumber] = id;
    db.prepare(`
      INSERT INTO personnel (id, army_number, rank, name, trade, appointment, unit_joining_date, current_status, status_reason, is_active, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 1, ?, ?, '2IC')
    `).run(id, p.armyNumber, p.rank, p.name, p.trade, p.appointment, p.status, p.reason || null, now, now);
  });

  // 4. Seed Daily Duties (Kote 12-Hour Continuous 3-Relief System & RP 24-Hour Timeline & Appointments)
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Kote Night Cycle (1800-0600):
  // - Group 1: 18-20 & 00-02 (2h + 2h = 4h active duty)
  // - Group 2: 20-22 & 02-04 (2h + 2h = 4h active duty)
  // - Group 3: 22-00 & 04-06 (2h + 2h = 4h active duty)
  // Kote Day Cycle (0600-1800):
  // - Group 1: 06-08 & 12-14 (2h + 2h = 4h active duty)
  // - Group 2: 08-10 & 14-16 (2h + 2h = 4h active duty)
  // - Group 3: 10-12 & 16-18 (2h + 2h = 4h active duty)
  const dutiesList = [
    // --- NIGHT CYCLE GROUP 1 (18-20 & 00-02) ---
    { armyNo: 'No-1440125', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 1)', cycle: 'NIGHT_18_06', grp: 1, loc: 'Main Armory', start: '18:00', end: '20:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1440125', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 1)', cycle: 'NIGHT_18_06', grp: 1, loc: 'Main Armory', start: '00:00', end: '02:00', duration: 2, night: 1, nightHrs: 2 },
    { armyNo: 'No-1460101', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 1)', cycle: 'NIGHT_18_06', grp: 1, loc: 'Main Armory', start: '18:00', end: '20:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460101', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 1)', cycle: 'NIGHT_18_06', grp: 1, loc: 'Main Armory', start: '00:00', end: '02:00', duration: 2, night: 1, nightHrs: 2 },

    // --- NIGHT CYCLE GROUP 2 (20-22 & 02-04) ---
    { armyNo: 'No-1441582', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 2)', cycle: 'NIGHT_18_06', grp: 2, loc: 'Main Armory', start: '20:00', end: '22:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1441582', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 2)', cycle: 'NIGHT_18_06', grp: 2, loc: 'Main Armory', start: '02:00', end: '04:00', duration: 2, night: 1, nightHrs: 2 },
    { armyNo: 'No-1460205', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 2)', cycle: 'NIGHT_18_06', grp: 2, loc: 'Main Armory', start: '20:00', end: '22:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460205', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 2)', cycle: 'NIGHT_18_06', grp: 2, loc: 'Main Armory', start: '02:00', end: '04:00', duration: 2, night: 1, nightHrs: 2 },

    // --- NIGHT CYCLE GROUP 3 (22-00 & 04-06) ---
    { armyNo: 'No-1450214', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 3)', cycle: 'NIGHT_18_06', grp: 3, loc: 'Main Armory', start: '22:00', end: '00:00', duration: 2, night: 1, nightHrs: 2 },
    { armyNo: 'No-1450214', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Night Cycle (Group 3)', cycle: 'NIGHT_18_06', grp: 3, loc: 'Main Armory', start: '04:00', end: '06:00', duration: 2, night: 1, nightHrs: 2 },
    { armyNo: 'No-1460420', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 3)', cycle: 'NIGHT_18_06', grp: 3, loc: 'Main Armory', start: '22:00', end: '00:00', duration: 2, night: 1, nightHrs: 2 },
    { armyNo: 'No-1460420', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Night Cycle (Group 3)', cycle: 'NIGHT_18_06', grp: 3, loc: 'Main Armory', start: '04:00', end: '06:00', duration: 2, night: 1, nightHrs: 2 },

    // --- DAY CYCLE GROUP 1 (06-08 & 12-14) ---
    { armyNo: 'No-1444502', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 1)', cycle: 'DAY_06_18', grp: 1, loc: 'Main Armory', start: '06:00', end: '08:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1444502', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 1)', cycle: 'DAY_06_18', grp: 1, loc: 'Main Armory', start: '12:00', end: '14:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460555', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 1)', cycle: 'DAY_06_18', grp: 1, loc: 'Main Armory', start: '06:00', end: '08:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460555', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 1)', cycle: 'DAY_06_18', grp: 1, loc: 'Main Armory', start: '12:00', end: '14:00', duration: 2, night: 0, nightHrs: 0 },

    // --- DAY CYCLE GROUP 2 (08-10 & 14-16) ---
    { armyNo: 'No-1445890', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 2)', cycle: 'DAY_06_18', grp: 2, loc: 'Main Armory', start: '08:00', end: '10:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1445890', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 2)', cycle: 'DAY_06_18', grp: 2, loc: 'Main Armory', start: '14:00', end: '16:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460618', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 2)', cycle: 'DAY_06_18', grp: 2, loc: 'Main Armory', start: '08:00', end: '10:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460618', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 2)', cycle: 'DAY_06_18', grp: 2, loc: 'Main Armory', start: '14:00', end: '16:00', duration: 2, night: 0, nightHrs: 0 },

    // --- DAY CYCLE GROUP 3 (10-12 & 16-18) ---
    { armyNo: 'No-1451325', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 3)', cycle: 'DAY_06_18', grp: 3, loc: 'Main Armory', start: '10:00', end: '12:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1451325', date: todayStr, dutyType: 'Kote Duty', role: 'Guard Commander', shift: 'Day Cycle (Group 3)', cycle: 'DAY_06_18', grp: 3, loc: 'Main Armory', start: '16:00', end: '18:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460729', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 3)', cycle: 'DAY_06_18', grp: 3, loc: 'Main Armory', start: '10:00', end: '12:00', duration: 2, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460729', date: todayStr, dutyType: 'Kote Duty', role: 'Guard', shift: 'Day Cycle (Group 3)', cycle: 'DAY_06_18', grp: 3, loc: 'Main Armory', start: '16:00', end: '18:00', duration: 2, night: 0, nightHrs: 0 },

    // RP 24-HOUR TIMELINE SLOTS (Variable manpower)
    { armyNo: 'No-1442301', date: todayStr, dutyType: 'RP Duty', role: 'Guard Commander', shift: 'RP 06:00-14:00', loc: 'Main Regimental Gate Post', start: '06:00', end: '14:00', duration: 8, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460833', date: todayStr, dutyType: 'RP Duty', role: 'Guard', shift: 'RP 06:00-14:00', loc: 'Main Regimental Gate Post', start: '06:00', end: '14:00', duration: 8, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460945', date: todayStr, dutyType: 'RP Duty', role: 'Guard', shift: 'RP 06:00-14:00', loc: 'Main Regimental Gate Post', start: '06:00', end: '14:00', duration: 8, night: 0, nightHrs: 0 },

    // TODAY'S OTHER SPECIALIZED APPOINTMENTS
    { armyNo: 'BA-9831', date: todayStr, dutyType: 'Duty Officer', role: 'Duty Officer', shift: '24h General', loc: 'Battalion HQ', start: '08:00', end: '08:00', duration: 24, night: 1, nightHrs: 8 },
    { armyNo: 'BJO-34102', date: todayStr, dutyType: 'Duty JCO', role: 'Duty JCO', shift: '24h General', loc: 'Unit Lines', start: '08:00', end: '08:00', duration: 24, night: 1, nightHrs: 8 },
    { armyNo: 'No-1428514', date: todayStr, dutyType: 'Duty Clerk', role: 'Duty Clerk', shift: 'Day Duty', loc: 'Battalion HQ Office', start: '08:00', end: '17:00', duration: 9, night: 0, nightHrs: 0 },
    { armyNo: 'No-1460312', date: todayStr, dutyType: '2nd Seater', role: '2nd Seater', shift: 'Day Duty', loc: 'CO Vehicle Escort', start: '08:00', end: '18:00', duration: 10, night: 0, nightHrs: 0 },
    { armyNo: 'No-1461011', date: todayStr, dutyType: 'Admin Driver', role: 'Admin Driver', shift: 'Day Duty', loc: 'MT Pool Ambulance', start: '08:00', end: '20:00', duration: 12, night: 0, nightHrs: 0 },
    { armyNo: 'No-1461122', date: todayStr, dutyType: 'Canteen', role: 'Canteen In-Charge', shift: 'Evening Duty', loc: 'Unit Canteen', start: '16:00', end: '21:00', duration: 5, night: 0, nightHrs: 0 },
    { armyNo: 'No-1461234', date: todayStr, dutyType: 'Medical Cover', role: 'Medical Assistant', shift: 'Night Standby', loc: 'MI Room Ward', start: '20:00', end: '06:00', duration: 10, night: 1, nightHrs: 8 },
  ];

  dutiesList.forEach((d, idx) => {
    const pId = personnelIds[d.armyNo];
    if (pId) {
      db.prepare(`
        INSERT INTO duties (id, date, personnel_id, duty_type, duty_role, shift_name, kote_cycle, kote_group, location, start_time, end_time, duration_hours, is_night_duty, night_duty_hours, remarks, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`duty_${idx + 1}`, d.date, pId, d.dutyType, d.role || d.dutyType, d.shift || 'General', d.cycle || null, d.grp || null, d.loc, d.start, d.end, d.duration, d.night, d.nightHrs, 'Routine Regimental Roster', now, now, 'DUTY_OFFICER');
    }
  });

  // 5. Seed PT & Games Records for Present Personnel (Last 7 days)
  const presentPersonnel = personnelSeedData.filter((p) => p.status === 'PRESENT');

  for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
    const dStr = format(subDays(new Date(), dayOffset), 'yyyy-MM-dd');
    presentPersonnel.forEach((p, idx) => {
      const pId = personnelIds[p.armyNumber];
      if (!pId) return;

      const isExcused = idx % 9 === 0;
      const ptStatus = isExcused ? 'EXCUSED_DUTY' : 'PRESENT';
      const gamesStatus = idx % 11 === 0 ? 'EXCUSED_DUTY' : 'PRESENT';

      db.prepare(`
        INSERT INTO pt_records (id, date, personnel_id, status, remarks, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'DUTY_OFFICER')
      `).run(`pt_${dStr}_${idx}`, dStr, pId, ptStatus, isExcused ? 'Post Night Guard Cover' : 'Regular PT', now, now);

      db.prepare(`
        INSERT INTO games_records (id, date, personnel_id, status, remarks, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'DUTY_OFFICER')
      `).run(`gm_${dStr}_${idx}`, dStr, pId, gamesStatus, 'Evening Unit Sports', now, now);
    });
  }

  // 6. Seed Leave Records
  const leaveSeedList = [
    {
      armyNo: 'No-1461567',
      type: 'P_LEAVE',
      start: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 20), 'yyyy-MM-dd'),
      days: 31,
      reason: 'Annual Privilege Leave (Harvesting)',
      addr: 'Vill: Chandpur, PS: Debidwar, Dist: Cumilla',
      contact: '01712345678',
      status: 'ACTIVE',
    },
    {
      armyNo: 'No-1461678',
      type: 'C_LEAVE',
      start: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
      days: 9,
      reason: 'Domestic Urgent Affairs',
      addr: 'Vill: Madhabpur, Dist: Habiganj',
      contact: '01898765432',
      status: 'ACTIVE',
    },
    {
      armyNo: 'No-1461789',
      type: 'MEDICAL_LEAVE',
      start: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      end: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      days: 13,
      reason: 'Post Dengue Medical Convalescence (CMH)',
      addr: 'CMH Savar Ward 4',
      contact: '01911223344',
      status: 'ACTIVE',
    },
    {
      armyNo: 'No-1460101',
      type: 'C_LEAVE',
      start: format(subDays(new Date(), 80), 'yyyy-MM-dd'),
      end: format(subDays(new Date(), 72), 'yyyy-MM-dd'),
      days: 9,
      reason: 'Home Visit',
      addr: 'Dist: Bogura',
      contact: '01700112233',
      status: 'RETURNED',
      retDate: format(subDays(new Date(), 72), 'yyyy-MM-dd'),
    },
    {
      armyNo: 'No-1460205',
      type: 'C_LEAVE',
      start: format(subDays(new Date(), 105), 'yyyy-MM-dd'),
      end: format(subDays(new Date(), 97), 'yyyy-MM-dd'),
      days: 9,
      reason: 'Family Emergency',
      addr: 'Dist: Tangail',
      contact: '01722334455',
      status: 'RETURNED',
      retDate: format(subDays(new Date(), 97), 'yyyy-MM-dd'),
    },
  ];

  leaveSeedList.forEach((l, idx) => {
    const pId = personnelIds[l.armyNo];
    if (pId) {
      db.prepare(`
        INSERT INTO leave_records (id, personnel_id, leave_type, start_date, end_date, total_days, reason, destination_address, emergency_contact, status, actual_return_date, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2IC')
      `).run(`leave_${idx + 1}`, pId, l.type, l.start, l.end, l.days, l.reason, l.addr, l.contact, l.status, l.retDate || null, now, now);
    }
  });

  // 7. Seed Initial Audit Logs
  db.prepare(`
    INSERT INTO audit_logs (id, appointment, user_display_name, action, entity_type, details, timestamp, ip_address)
    VALUES (?, '2IC', 'Second-in-Command (2IC)', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'UnitPulse initialized for 55 Fd Amb (10 Inf Div)', ?, '127.0.0.1')
  `).run(`audit_init_1`, now);

  console.log('[UnitPulse] Database seeded with complete 3-Relief Kote System (Full 12h coverage for Night and Day cycles).');
}
