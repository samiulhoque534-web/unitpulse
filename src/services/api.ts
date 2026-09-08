import {
  User,
  Personnel,
  DutyRecord,
  PTRecord,
  GamesRecord,
  LeaveRecord,
  AuditLog,
  ManpowerSummary,
  TradeManpowerItem,
  AppointmentRole,
  KoteCycleSummary,
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('unitpulse_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('unitpulse_auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('unitpulse_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred during network request';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { appointment: AppointmentRole; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAppointments: () =>
    request<{ appointments: { role: AppointmentRole; title: string; desc: string }[] }>('/auth/appointments'),

  // Personnel (Contains ONLY: Army Number, Rank, Name, Trade, Appointment, Status)
  getPersonnel: (params: { search?: string; rank?: string; trade?: string; status?: string; isActive?: string | boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.rank) q.append('rank', params.rank);
    if (params.trade) q.append('trade', params.trade);
    if (params.status) q.append('status', params.status);
    if (params.isActive !== undefined) q.append('isActive', String(params.isActive));
    return request<{ personnel: Personnel[]; total: number }>(`/personnel?${q.toString()}`);
  },

  getPersonnelDossier: (id: string) => request<any>(`/personnel/${id}`),

  createPersonnel: (data: any) =>
    request<{ message: string; id: string }>('/personnel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePersonnel: (id: string, data: any) =>
    request<{ message: string }>(`/personnel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updatePersonnelStatus: (id: string, data: { currentStatus: string; statusReason?: string }) =>
    request<{ message: string }>(`/personnel/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deactivatePersonnel: (id: string) =>
    request<{ message: string }>(`/personnel/${id}/deactivate`, {
      method: 'PUT',
    }),

  deletePersonnel: (id: string) =>
    request<{ message: string; safeDeleted?: boolean; historicalRecordsCount?: number }>(`/personnel/${id}`, {
      method: 'DELETE',
    }),

  restorePersonnel: (id: string) =>
    request<{ message: string }>(`/personnel/${id}/restore`, {
      method: 'PUT',
    }),

  bulkImportPersonnel: (rows: any[]) =>
    request<{ message: string }>('/personnel/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }),

  // Manpower
  getManpowerDashboard: () =>
    request<{
      summary: ManpowerSummary & { shortageHeld?: number; shortagePresent?: number; overallAuthorized?: number; tradeAuthorizedSum?: number };
      tradeAnalysis: TradeManpowerItem[];
      statusPieData: { name: string; value: number; color: string }[];
      awayPersonnel: any[];
    }>('/manpower/dashboard'),

  getAuthorizedManpower: () =>
    request<{ authorized: number }>('/manpower/authorized'),

  updateAuthorizedManpower: (authorized: number) =>
    request<{ message: string; authorized: number }>('/manpower/authorized', {
      method: 'PUT',
      body: JSON.stringify({ authorized }),
    }),

  getTradeAuthorized: () =>
    request<{ tradeAuthorized: Record<string, number> }>('/manpower/trade-authorized'),

  updateTradeAuthorized: (data: { trade?: string; authorized?: number; tradeAuthorized?: Record<string, number> }) =>
    request<{ message: string; tradeAuthorized: Record<string, number> }>('/manpower/trade-authorized', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Duties
  getDutyRoster: (params: { date?: string; startDate?: string; endDate?: string; dutyType?: string; personnelId?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.append('date', params.date);
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.dutyType) q.append('dutyType', params.dutyType);
    if (params.personnelId) q.append('personnelId', params.personnelId);
    if (params.search) q.append('search', params.search);
    return request<{ duties: DutyRecord[] }>(`/duties/roster?${q.toString()}`);
  },

  getKoteCycles: (date?: string) =>
    request<{ date: string; nightCycle: KoteCycleSummary; dayCycle: KoteCycleSummary }>(`/duties/kote-cycles?date=${date || ''}`),

  assignKoteCycle: (data: {
    date: string;
    cycle: 'NIGHT_18_06' | 'DAY_06_18';
    groups?: Array<{ groupNumber: number; guardCommanderId: string; guardId: string }>;
    groupNumber?: number;
    guardCommanderId?: string;
    guardId?: string;
    location?: string;
  }) =>
    request<{ message: string; warnings?: string[] }>('/duties/kote-cycle', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveRPTimeline: (data: { date: string; slots: any[] }) =>
    request<{ message: string; createdCount: number; warnings?: string[] }>('/duties/rp-timeline', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUpcomingDuties: (filter: string = 'next7') =>
    request<{ upcomingDuties: DutyRecord[]; filter: string; total: number }>(`/duties/upcoming?filter=${filter}`),

  getDutyCalendar: (month?: string) =>
    request<{ month: string; dateMap: Record<string, DutyRecord[]>; totalDuties: number }>(`/duties/calendar?month=${month || ''}`),

  getCurrentlyOnDuty: () =>
    request<{ onDutyPersonnel: DutyRecord[]; total: number }>('/duties/currently-on-duty'),

  assignDuty: (data: any) =>
    request<{ message: string; id: string; hasOverlap: boolean; overlapWarning?: string; availabilityWarning?: string }>('/duties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  batchAssignDuties: (data: { date: string; duties: any[] }) =>
    request<{ message: string; createdCount: number }>('/duties/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDuty: (id: string) =>
    request<{ message: string }>(`/duties/${id}`, {
      method: 'DELETE',
    }),

  // PT (Strict PRESENT eligibility)
  getDailyPTSheet: (date?: string) =>
    request<{
      date: string;
      sheet: any[];
      nonPresentWithRecords?: any[];
      summary: {
        totalEligible: number;
        presentCount: number;
        excusedDutyCount: number;
        excusedMedCount: number;
        absentCount: number;
        participationPct: number;
      };
    }>(`/pt/daily-sheet?date=${date || ''}`),

  saveDailyPTSheet: (data: { date: string; records: any[] }) =>
    request<{ message: string }>('/pt/daily-sheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPTAnalytics: () => request<any>('/pt/analytics'),

  // Games (Strict PRESENT eligibility)
  getDailyGamesSheet: (date?: string) =>
    request<{
      date: string;
      sheet: any[];
      nonPresentWithRecords?: any[];
      summary: {
        totalEligible: number;
        presentCount: number;
        excusedDutyCount: number;
        excusedMedCount: number;
        absentCount: number;
        participationPct: number;
      };
    }>(`/games/daily-sheet?date=${date || ''}`),

  saveDailyGamesSheet: (data: { date: string; records: any[] }) =>
    request<{ message: string }>('/games/daily-sheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getGamesAnalytics: () => request<any>('/games/analytics'),

  // Leave
  getLeaveRecords: (params: { leaveType?: string; status?: string; personnelId?: string; search?: string; year?: string | number } = {}) => {
    const q = new URLSearchParams();
    if (params.leaveType) q.append('leaveType', params.leaveType);
    if (params.status) q.append('status', params.status);
    if (params.personnelId) q.append('personnelId', params.personnelId);
    if (params.search) q.append('search', params.search);
    if (params.year) q.append('year', String(params.year));
    return request<{ records: LeaveRecord[] }>(`/leave/records?${q.toString()}`);
  },

  getSoldierEntitlement: (personnelId: string) =>
    request<any>(`/leave/entitlement/${personnelId}`),

  sanctionLeave: (data: any) =>
    request<{ message: string; id: string; advisory?: string }>('/leave', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLeave: (id: string, data: any) =>
    request<{ message: string }>(`/leave/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLeave: (id: string) =>
    request<{ message: string; deletedId?: string }>(`/leave/${id}`, {
      method: 'DELETE',
    }),

  returnFromLeave: (id: string, data?: { actualReturnDate?: string }) =>
    request<{ message: string }>(`/leave/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify(data || {}),
    }),

  getLeaveReminders: () =>
    request<{
      dueIn15Days: any[];
      overdue: any[];
      upcomingLeaves: any[];
      counts: { dueIn15Days: number; overdue: number; upcoming: number };
    }>('/leave/reminders'),

  get3MonthForecast: () =>
    request<{ forecast: { month: string; monthKey: string; personnel: any[] }[]; registerEntries?: any[] }>('/leave/forecast-3m'),

  getYearlyLeaveSummary: (year?: number) =>
    request<{ year: number; summary: any[] }>(`/leave/yearly-summary?year=${year || ''}`),

  // Analytics
  getDutyAnalytics: (period: string = 'monthly') =>
    request<any>(`/analytics/duty?period=${period}`),

  getDutyVsPTGamesAnalytics: (days: number = 30) =>
    request<any>(`/analytics/duty-vs-pt-games?days=${days}`),

  // Reports
  generateReport: (params: {
    reportType: string;
    date?: string;
    year?: number;
    month?: string;
    personnelId?: string;
    dutyType?: string;
    leaveType?: string;
    trade?: string;
  }) => {
    const q = new URLSearchParams();
    q.append('reportType', params.reportType);
    if (params.date) q.append('date', params.date);
    if (params.year) q.append('year', String(params.year));
    if (params.month) q.append('month', params.month);
    if (params.personnelId) q.append('personnelId', params.personnelId);
    if (params.dutyType) q.append('dutyType', params.dutyType);
    if (params.leaveType) q.append('leaveType', params.leaveType);
    if (params.trade) q.append('trade', params.trade);
    return request<{ title: string; metadata: any; data: any }>(`/reports/generate?${q.toString()}`);
  },

  // Audit
  getAuditLogs: (params: { action?: string; appointment?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.action) q.append('action', params.action);
    if (params.appointment) q.append('appointment', params.appointment);
    if (params.search) q.append('search', params.search);
    return request<{ logs: AuditLog[]; total: number }>(`/audit/logs?${q.toString()}`);
  },
};
