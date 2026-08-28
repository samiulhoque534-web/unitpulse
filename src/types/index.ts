export type AppointmentRole = 'CO' | '2IC' | 'DUTY_OFFICER' | 'DUTY_MUNSHI';

export interface User {
  id: string;
  appointment: AppointmentRole;
  displayName: string;
  role: AppointmentRole;
  createdAt?: string;
  updatedAt?: string;
}

export type RankType =
  | 'Lieutenant Colonel'
  | 'Major'
  | 'Captain'
  | 'Lieutenant'
  | '2Lieutenant'
  | 'Master Warrent Officer'
  | 'Senior Warrent Officer'
  | 'Warrent Officer'
  | 'Sergent'
  | 'Corporal'
  | 'Lance Corporal'
  | 'Sainik'
  | 'NC(E)'
  | 'Civil';

export type TradeType =
  | 'Offr'
  | 'MA'
  | 'MT'
  | 'SMT'
  | 'Clerk'
  | 'EME'
  | 'Lab Tech'
  | 'OTA'
  | 'Dispenser'
  | 'Cook'
  | 'Tradesman'
  | 'NC(E)'
  | 'NCU';

export type ManpowerStatus = 'PRESENT' | 'TY_DUTY' | 'ATTACHMENT' | 'LEAVE' | 'OTHER';

export type DutyType =
  | 'Kote Duty'
  | 'RP Duty'
  | 'Duty Officer'
  | 'Duty JCO'
  | 'Duty NCO'
  | 'Duty Clerk'
  | '2nd Seater'
  | 'Admin Driver'
  | 'Canteen'
  | 'Medical Cover'
  | 'Others';

export type DutyRole =
  | 'Guard Commander'
  | 'Guard'
  | 'Duty Officer'
  | 'Duty JCO'
  | 'Duty NCO'
  | 'Duty Clerk'
  | '2nd Seater'
  | 'Admin Driver'
  | 'Canteen In-Charge'
  | 'Medical Assistant'
  | 'Other Member';

export type KoteCycleType = 'NIGHT_18_06' | 'DAY_06_18';

export type DutyActiveStatus = 'UPCOMING' | 'ON_DUTY' | 'COMPLETED';

export type LeaveType = 'P_LEAVE' | 'C_LEAVE' | 'MATERNITY_LEAVE' | 'MEDICAL_LEAVE';

export type FatigueLevel = 'LOW' | 'MODERATE' | 'HIGH';

// Personnel contains ONLY: Army Number, Rank, Name, Trade, Appointment, Status
export interface Personnel {
  id: string;
  armyNumber: string;
  rank: RankType;
  name: string;
  trade: TradeType;
  appointment: string;
  currentStatus: ManpowerStatus;
  statusReason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface DutyRecord {
  id: string;
  date: string;
  personnelId: string;
  dutyType: DutyType;
  dutyRole?: string;
  shiftName?: string;
  koteCycle?: KoteCycleType;
  koteGroup?: number;
  location: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  isNightDuty: boolean;
  nightDutyHours: number;
  remarks?: string;
  activeStatus?: DutyActiveStatus;
  createdAt?: string;
  updatedAt?: string;
  armyNumber?: string;
  rank?: RankType;
  name?: string;
  trade?: TradeType;
  currentStatus?: ManpowerStatus;
}

export interface KoteGroupSummary {
  groupNumber: 1 | 2 | 3;
  groupLabel: string;
  guardCommander?: {
    id: string;
    armyNumber: string;
    rank: RankType;
    name: string;
    trade: TradeType;
  };
  guard?: {
    id: string;
    armyNumber: string;
    rank: RankType;
    name: string;
    trade: TradeType;
  };
  dutyIntervals: string[];
  restIntervals: string[];
  activeHours: number;
  restHours: number;
}

export interface KoteCycleSummary {
  cycle: KoteCycleType;
  cycleLabel: string;
  cycleTime: string;
  groups: KoteGroupSummary[];
  totalActiveHours: number;
}

export interface RPTimelineSlot {
  id: string;
  startTime: string;
  endTime: string;
  guardCommanders: string[];
  guards: string[];
  location: string;
  remarks?: string;
}

export interface PTRecord {
  id: string;
  date: string;
  personnelId: string;
  status: 'PRESENT' | 'EXCUSED_DUTY' | 'EXCUSED_MEDICAL' | 'ABSENT';
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  armyNumber?: string;
  rank?: RankType;
  name?: string;
  trade?: TradeType;
  currentStatus?: ManpowerStatus;
  isEligible?: boolean;
}

export interface GamesRecord {
  id: string;
  date: string;
  personnelId: string;
  status: 'PRESENT' | 'EXCUSED_DUTY' | 'EXCUSED_MEDICAL' | 'ABSENT';
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  armyNumber?: string;
  rank?: RankType;
  name?: string;
  trade?: TradeType;
  currentStatus?: ManpowerStatus;
  isEligible?: boolean;
}

export interface LeaveRecord {
  id: string;
  personnelId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  destinationAddress?: string;
  emergencyContact?: string;
  status: 'UPCOMING' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
  actualReturnDate?: string;
  createdAt: string;
  updatedAt: string;
  armyNumber?: string;
  rank?: RankType;
  name?: string;
  trade?: TradeType;
}

export interface AuditLog {
  id: string;
  appointment: string;
  userDisplayName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface ManpowerSummary {
  authorized: number;
  held: number;
  present: number;
  tyDuty: number;
  attachment: number;
  leave: number;
  other: number;
  effectiveAvailable: number;
  shortageHeld?: number;
  shortagePresent?: number;
  overallAuthorized?: number;
  tradeAuthorizedSum?: number;
  heldPercentage: number;
  presentPercentage: number;
  effectivePercentage: number;
}

export interface TradeManpowerItem {
  trade: TradeType;
  authorized: number;
  held: number;
  present: number;
  absent: number;
  absentBreakdown?: {
    leave: number;
    course: number;
    tyDuty: number;
    attachment: number;
    hospital: number;
    other: number;
    personnel: Array<{
      id: string;
      armyNumber: string;
      rank: RankType;
      name: string;
      trade: TradeType;
      status: ManpowerStatus;
      reason: string;
    }>;
  };
  surplus: number;
  percentage: number;
  shortage?: number;
  shortagePresent?: number;
  heldPercentage?: number;
}
