export type DayCategory = 'absent' | 'weekend' | 'holiday' | 'leave' | 'excused' | 'overtime_manual' | 'wfh' | 'present';

export type PermissionStatus = 'not_filed' | 'filed';

export type UserRole = 'employee' | 'team_leader' | 'manager' | 'admin';

export interface TeamInfo {
  id: string;
  name: string;
  leaderSapId: string;
  leaderName: string;
  department: string;
  memberSapIds: string[];
  managerSapId?: string;
  managerName?: string;
}

export interface UserProfile {
  id: string;
  sapId: string;
  name: string;
  role: UserRole;
  email: string;
  department: string;
  avatar?: string;
  title: string;
  teamId?: string;
  teamName?: string;
  teamLeaderSapId?: string;
  teamLeaderName?: string;
  managerSapId?: string;
  managerName?: string;
}

export interface EmployeeRecord {
  id: string; // Numeric SAP ID
  name: string;
  department?: string;
  teamId?: string;
  teamName?: string;
  teamLeaderSapId?: string;
  teamLeaderName?: string;
}

export interface PunchRow {
  date: string; // YYYY.MM.DD
  start: string; // HH:MM:SS
  end: string; // HH:MM:SS
}

export interface RuleSettings {
  timeOn: boolean;
  timeVal: string; // Standard days overtime cutoff, e.g. "17:50" (5:50 PM)
  hoursOn: boolean;
  hoursVal: number; // e.g. 8
  lateOn: boolean;
  lateVal: string; // e.g. "09:15"
  thursdayEarlyShift?: boolean; // Thursday shift ends at 16:00 (4:00 PM)
  thursdayShiftEnd?: string; // e.g. "16:00"
  thursdayOvertimeStart?: string; // e.g. "16:50" (4:50 PM)
  tuesdayEarlyShift?: boolean; // Legacy alias for backward compatibility
  tuesdayShiftEnd?: string;
  weekendDays: number[]; // e.g. [0, 5] (Sunday & Friday) or [0, 5, 6]
}

export interface ExportSettings {
  name: string;
  employeeId: string; // Must be numeric SAP ID
  shiftEnd: string;
  teamId?: string;
  teamName?: string;
  teamLeaderSapId?: string;
  teamLeaderName?: string;
  managerSapId?: string;
  managerName?: string;
}

export type DayStatus = 'present' | 'overtime' | 'absent' | 'missing' | 'excused';

export interface DayClassification {
  row: PunchRow;
  status: DayStatus;
  workedMin: number;
  startMin: number | null;
  endMin: number | null;
  reasons: string[];
  overtimeMin: number;
  isLate: boolean;
  lateMin: number;
  userReason?: string;
  category?: DayCategory;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface OvertimeDayItem {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftEndStandard: string;
  overtimeMinutes: number; // Current/Approved overtime minutes
  originalOvertimeMinutes?: number; // Original claimed overtime before team leader adjustment
  isAdjustedByLeader?: boolean; // True if team leader corrected/reduced/increased the overtime
  adjustedReason?: string; // Leader's justification for changing the overtime duration
  reason: string; // Employee's justification
  category: DayCategory;
  status: ApprovalStatus;
  leaderNotes?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface OvertimeSubmission {
  id: string;
  employeeId: string; // Numeric SAP ID
  employeeName: string;
  department: string;
  teamId?: string;
  teamName?: string;
  teamLeaderSapId?: string;
  teamLeaderName?: string;
  managerSapId?: string;
  managerName?: string;
  submitterRole?: UserRole;
  periodLabel: string; // e.g. "16 Jul 2026 – 15 Aug 2026"
  submittedAt: string;
  status: ApprovalStatus;
  totalOvertimeMinutes: number; // Sum of current overtime minutes
  originalTotalOvertimeMinutes?: number; // Sum of original claimed overtime minutes
  items: OvertimeDayItem[];
  leaderComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type ActiveAppTab = 'employee_ledger' | 'team_leader_approvals' | 'manager_overview' | 'database_config';

export type ThemeMode = 'dark' | 'light';
export type Language = 'en' | 'ar';
