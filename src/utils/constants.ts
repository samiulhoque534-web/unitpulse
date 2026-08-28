import { RankType, TradeType, DutyType, DutyRole, LeaveType, AppointmentRole } from '../types';

export const UNIT_NAME = '55 Fd Amb (10 Inf Div)';
export const APP_NAME = 'UNITPULSE';
export const APP_SUBTITLE = 'Personnel, Manpower, Duty & Leave Management System';

export const RANKS: RankType[] = [
  'Lieutenant Colonel',
  'Major',
  'Captain',
  'Lieutenant',
  '2Lieutenant',
  'Master Warrent Officer',
  'Senior Warrent Officer',
  'Warrent Officer',
  'Sergent',
  'Corporal',
  'Lance Corporal',
  'Sainik',
  'NC(E)',
  'Civil',
];

export const OFFICER_RANKS: RankType[] = [
  'Lieutenant Colonel',
  'Major',
  'Captain',
  'Lieutenant',
  '2Lieutenant',
];

export const JCO_OR_RANKS: RankType[] = [
  'Master Warrent Officer',
  'Senior Warrent Officer',
  'Warrent Officer',
  'Sergent',
  'Corporal',
  'Lance Corporal',
  'Sainik',
  'NC(E)',
  'Civil',
];

export function getRankPLeaveLimit(rank: string): number {
  if (OFFICER_RANKS.includes(rank as RankType)) {
    return 30;
  }
  return 60;
}

export function isOfficerRank(rank: string): boolean {
  return OFFICER_RANKS.includes(rank as RankType);
}

export const TRADES: TradeType[] = [
  'Offr',
  'MA',
  'MT',
  'SMT',
  'Clerk',
  'EME',
  'Lab Tech',
  'OTA',
  'Dispenser',
  'Cook',
  'Tradesman',
  'NC(E)',
  'NCU',
];

export const DEFAULT_TRADE_AUTHORIZED: Record<TradeType, number> = {
  Offr: 10,
  MA: 15,
  MT: 12,
  SMT: 5,
  Clerk: 8,
  EME: 4,
  'Lab Tech': 3,
  OTA: 2,
  Dispenser: 3,
  Cook: 8,
  Tradesman: 5,
  'NC(E)': 4,
  NCU: 2,
};

export const DUTY_TYPES: DutyType[] = [
  'Kote Duty',
  'RP Duty',
  'Duty Officer',
  'Duty JCO',
  'Duty NCO',
  'Duty Clerk',
  '2nd Seater',
  'Admin Driver',
  'Canteen',
  'Medical Cover',
  'Others',
];

export const DUTY_ROLES: DutyRole[] = [
  'Guard Commander',
  'Guard',
  'Duty Officer',
  'Duty JCO',
  'Duty NCO',
  'Duty Clerk',
  '2nd Seater',
  'Admin Driver',
  'Canteen In-Charge',
  'Medical Assistant',
  'Other Member',
];

export const LEAVE_TYPES: { type: LeaveType; label: string; color: string }[] = [
  { type: 'P_LEAVE', label: 'P Leave', color: '#3b82f6' },
  { type: 'C_LEAVE', label: 'C Leave', color: '#10b981' },
  { type: 'MATERNITY_LEAVE', label: 'Maternity Leave', color: '#ec4899' },
  { type: 'MEDICAL_LEAVE', label: 'Medical Leave', color: '#f59e0b' },
];

export const APPOINTMENTS: { role: AppointmentRole; title: string; desc: string; accessLevel: string }[] = [
  {
    role: 'CO',
    title: 'Commanding Officer (CO)',
    desc: 'Executive Command & Full Visibility (Strictly Read-Only)',
    accessLevel: 'Read-Only',
  },
  {
    role: '2IC',
    title: 'Second-in-Command (2IC)',
    desc: 'Full Personnel, Manpower, Duty & Leave Management',
    accessLevel: 'Full Operational Control',
  },
  {
    role: 'DUTY_OFFICER',
    title: 'Duty Officer',
    desc: 'Daily Duty Roster & PT/Games Attendance Management',
    accessLevel: 'Duty & PT/Games Control',
  },
  {
    role: 'DUTY_MUNSHI',
    title: 'Duty Munshi',
    desc: 'Daily Administrative Records, Attendance & Leave Entry',
    accessLevel: 'Daily Admin Data Entry',
  },
];

export const MANPOWER_STATUSES = [
  { id: 'PRESENT', label: 'Present', color: 'emerald', isPresent: true },
  { id: 'TY_DUTY', label: 'TY Duty', color: 'blue', isPresent: false },
  { id: 'ATTACHMENT', label: 'Attachment', color: 'purple', isPresent: false },
  { id: 'LEAVE', label: 'Leave', color: 'amber', isPresent: false },
  { id: 'OTHER', label: 'Other Absence (Course/Hospital)', color: 'rose', isPresent: false },
];

export const DUTY_COLORS: Record<string, string> = {
  'Kote Duty': '#ef4444',
  'RP Duty': '#f97316',
  'Duty Officer': '#3b82f6',
  'Duty JCO': '#8b5cf6',
  'Duty NCO': '#06b6d4',
  'Duty Clerk': '#eab308',
  '2nd Seater': '#ec4899',
  'Admin Driver': '#14b8a6',
  'Canteen': '#10b981',
  'Medical Cover': '#f43f5e',
  'Others': '#64748b',
};
