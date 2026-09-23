import React, { useEffect, useState } from 'react';
import { 
  ActiveAppTab, 
  DayCategory, 
  ExportSettings, 
  OvertimeSubmission, 
  PermissionStatus, 
  RuleSettings, 
  ThemeMode, 
  UserProfile 
} from './types';
import {
  classifyDay,
  exportOvertimeToExcel,
  fmtHours,
  parseRows,
  to12Hour,
  toHM,
  weekdayOf,
} from './utils/parser';
import {
  lookupEmployeeById,
  saveEmployeeMapping,
  normalizeEmployeeId,
} from './utils/employeeDirectory';
import { 
  getActiveUser, 
  getSubmissions, 
  saveSubmission, 
  setActiveUser,
  getTeamForSapId,
  getTeamById,
  getTeams
} from './utils/teamDatabase';
import { Masthead } from './components/Masthead';
import { RawInputCard } from './components/RawInputCard';
import { RulesCard } from './components/RulesCard';
import { LateAlertBanner } from './components/LateAlertBanner';
import { ExportCard } from './components/ExportCard';
import { ProfileCard } from './components/ProfileCard';
import { VerificationExportCard } from './components/VerificationExportCard';
import { EmployeeReportHero } from './components/EmployeeReportHero';
import { SummaryCard } from './components/SummaryCard';
import { DayTable } from './components/DayTable';
import { StickyNotesModal } from './components/StickyNotesModal';
import { EmployeeDirectoryModal } from './components/EmployeeDirectoryModal';
import { TeamLeaderApprovals } from './components/TeamLeaderApprovals';
import { ManagerOverview } from './components/ManagerOverview';
import { XamppDatabaseModal } from './components/XamppDatabaseModal';
import { EmployeeSubmissionStatus } from './components/EmployeeSubmissionStatus';
import { OvertimeLedgerChart } from './components/OvertimeLedgerChart';
import { DuplicateSubmissionModal } from './components/DuplicateSubmissionModal';
import { FloatingPortalDock } from './components/FloatingPortalDock';
import {
  Check,
  CheckCircle2,
  LayoutDashboard,
  CalendarDays,
  Keyboard,
  FileEdit,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Sliders,
  FileText,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

export default function App() {
  const { t } = useLanguage();
  // Theme mode: dark or light
  const [theme, setTheme] = useState<ThemeMode>(() => {

    const saved = localStorage.getItem('ledger_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ledger_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Active User Profile & Role Permissions
  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => getActiveUser());
  const [activeTab, setActiveTab] = useState<ActiveAppTab>('employee_ledger');
  const [ledgerSection, setLedgerSection] = useState<'section1' | 'section2' | 'section3'>('section1');
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Role Access Guard: Ensure employees cannot view Leader/Manager tabs or Database/Manage modal, and Team Leaders cannot view Manager tab
  useEffect(() => {
    if (currentUser.role === 'employee') {
      if (activeTab === 'team_leader_approvals' || activeTab === 'manager_overview') {
        setActiveTab('employee_ledger');
      }
      if (isDatabaseModalOpen) {
        setIsDatabaseModalOpen(false);
      }
    } else if (currentUser.role === 'team_leader' && activeTab === 'manager_overview') {
      setActiveTab('team_leader_approvals');
    }
  }, [currentUser.role, activeTab, isDatabaseModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSwitchUser = (user: UserProfile) => {
    setActiveUser(user);
    setCurrentUserState(user);

    // SECURITY: Clear previous user's punch data and reasons for privacy
    setRawInput('');
    setOverrides({});
    setPermissionsFiled({});
    setAbsenceCheckpoints({});
    setDayReasons({});
    localStorage.removeItem('ledger_raw_input');
    localStorage.removeItem('ledger_category_overrides');
    localStorage.removeItem('ledger_permissions_filed');
    localStorage.removeItem('ledger_absence_checkpoints');
    localStorage.removeItem('ledger_day_reasons');

    // Auto populate export settings for this employee
    setExportSettings({
      name: user.name,
      employeeId: user.sapId,
      shiftEnd: '17:00',
    });
    showToast(`Switched profile to ${user.name}. Timesheet reset for data privacy.`);
  };

  // State for raw input, rules, export settings, and overrides with persistent LocalStorage
  const [rawInput, setRawInput] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const punchParam = params.get('punch') || params.get('data');
    if (punchParam) {
      try {
        return decodeURIComponent(punchParam);
      } catch (e) {
        // Fallback
      }
    }
    const saved = localStorage.getItem('ledger_raw_input');
    if (saved !== null && saved !== undefined) {
      return saved;
    }
    return '';
  });

  useEffect(() => {
    localStorage.setItem('ledger_raw_input', rawInput);
  }, [rawInput]);

  const [rules, setRules] = useState<RuleSettings>(() => {
    try {
      const saved = localStorage.getItem('ledger_attendance_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        const regularCutoff = (parsed.timeVal === '17:45' || parsed.timeVal === '17:15' || !parsed.timeVal) ? '17:50' : parsed.timeVal;
        return {
          timeOn: parsed.timeOn ?? true,
          timeVal: regularCutoff,
          hoursOn: parsed.hoursOn ?? true,
          hoursVal: typeof parsed.hoursVal === 'number' ? parsed.hoursVal : 8,
          lateOn: parsed.lateOn ?? true,
          lateVal: parsed.lateVal || '09:15',
          thursdayEarlyShift: parsed.thursdayEarlyShift ?? true,
          thursdayShiftEnd: parsed.thursdayShiftEnd || '16:00',
          thursdayOvertimeStart: parsed.thursdayOvertimeStart || '16:50',
          weekendDays: Array.isArray(parsed.weekendDays) ? parsed.weekendDays : [0, 5, 6],
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      timeOn: true,
      timeVal: '17:50',
      hoursOn: true,
      hoursVal: 8,
      lateOn: true,
      lateVal: '09:15',
      thursdayEarlyShift: true,
      thursdayShiftEnd: '16:00',
      thursdayOvertimeStart: '16:50',
      weekendDays: [0, 5, 6], // Sunday (0), Friday (5), Saturday (6)
    };
  });

  useEffect(() => {
    localStorage.setItem('ledger_attendance_rules', JSON.stringify(rules));
  }, [rules]);

  const weekendDays = rules.weekendDays || [0, 5, 6];

  const handleToggleWeekendDay = (dayIndex: number) => {
    const current = rules.weekendDays || [0, 5, 6];
    let next: number[];
    if (current.includes(dayIndex)) {
      next = current.filter((d) => d !== dayIndex);
    } else {
      next = [...current, dayIndex].sort((a, b) => a - b);
    }
    setRules((prev) => ({ ...prev, weekendDays: next }));
  };

  const handleSetWeekendDays = (days: number[]) => {
    setRules((prev) => ({ ...prev, weekendDays: days }));
  };

  const [exportSettings, setExportSettings] = useState<ExportSettings>(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    const idParam = params.get('id') || params.get('sap');
    try {
      const saved = localStorage.getItem('ledger_export_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedId = idParam || normalizeEmployeeId(parsed.employeeId || '');
        let savedName = nameParam ? decodeURIComponent(nameParam) : (parsed.name || '').trim();

        if (savedId && !savedName) {
          const lookedUp = lookupEmployeeById(savedId);
          if (lookedUp) savedName = lookedUp;
        }

        return {
          name: savedName,
          employeeId: savedId,
          shiftEnd: parsed.shiftEnd || '17:00',
        };
      }
    } catch (e) {
      console.error(e);
    }

    const initialId = idParam ? normalizeEmployeeId(idParam) : '';
    const initialName = nameParam ? decodeURIComponent(nameParam) : (initialId ? lookupEmployeeById(initialId) || '' : '');

    return {
      name: initialName,
      employeeId: initialId,
      shiftEnd: '17:00',
    };
  });

  const handleChangeExportSettings = (newSettings: ExportSettings) => {
    setExportSettings(newSettings);
  };

  useEffect(() => {
    localStorage.setItem('ledger_export_settings', JSON.stringify(exportSettings));
    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const cleanName = exportSettings.name.trim();
    if (cleanId && cleanName) {
      saveEmployeeMapping(cleanId, cleanName);
    }
  }, [exportSettings]);

  const [overrides, setOverrides] = useState<Record<string, DayCategory>>(() => {
    try {
      const saved = localStorage.getItem('ledger_category_overrides');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('ledger_category_overrides', JSON.stringify(overrides));
  }, [overrides]);

  const [permissionsFiled, setPermissionsFiled] = useState<Record<string, PermissionStatus>>(() => {
    try {
      const saved = localStorage.getItem('ledger_permissions_filed');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('ledger_permissions_filed', JSON.stringify(permissionsFiled));
  }, [permissionsFiled]);

  const [absenceCheckpoints, setAbsenceCheckpoints] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ledger_absence_checkpoints');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('ledger_absence_checkpoints', JSON.stringify(absenceCheckpoints));
  }, [absenceCheckpoints]);

  const handleToggleAbsenceCheckpoint = (date: string) => {
    setAbsenceCheckpoints((prev) => {
      const isCurrentlyChecked = !!prev[date] || overrides[date] === 'leave' || overrides[date] === 'excused';
      const willBeChecked = !isCurrentlyChecked;
      const next = { ...prev, [date]: willBeChecked };

      if (willBeChecked) {
        setOverrides((currOverrides) => ({ ...currOverrides, [date]: 'leave' }));
      } else {
        setOverrides((currOverrides) => ({ ...currOverrides, [date]: 'absent' }));
      }

      return next;
    });
  };

  const [dayReasons, setDayReasons] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ledger_day_reasons');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('ledger_day_reasons', JSON.stringify(dayReasons));
  }, [dayReasons]);

  // Modals state
  const [isStickyNotesOpen, setIsStickyNotesOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [duplicateWarningSubmission, setDuplicateWarningSubmission] = useState<OvertimeSubmission | null>(null);

  // Submissions count for badges
  const [allSubmissions, setAllSubmissions] = useState<OvertimeSubmission[]>(() => getSubmissions());
  useEffect(() => {
    const handleSubmissionsChange = () => {
      setAllSubmissions(getSubmissions());
    };
    window.addEventListener('team_submissions_updated', handleSubmissionsChange);
    return () => window.removeEventListener('team_submissions_updated', handleSubmissionsChange);
  }, []);

  const pendingApprovalsCount = allSubmissions.filter((s) => s.status === 'pending').length;

  const handleResetSession = () => {
    setExportSettings({
      name: '',
      employeeId: '',
      shiftEnd: '17:00',
    });
    setRawInput('');
    setOverrides({});
    setPermissionsFiled({});
    setAbsenceCheckpoints({});
    setDayReasons({});
    localStorage.removeItem('ledger_raw_input');
    localStorage.removeItem('ledger_category_overrides');
    localStorage.removeItem('ledger_permissions_filed');
    localStorage.removeItem('ledger_absence_checkpoints');
    localStorage.removeItem('ledger_day_reasons');
    localStorage.removeItem('ledger_export_settings');

    showToast('Timesheet reset: ready for a new employee entry.');
  };

  const handleUpdateOverride = (date: string, category: DayCategory) => {
    setOverrides((prev) => ({ ...prev, [date]: category }));
  };

  const handleTogglePermission = (date: string) => {
    setPermissionsFiled((prev) => ({
      ...prev,
      [date]: prev[date] === 'filed' ? 'not_filed' : 'filed',
    }));
  };

  const handleUpdateReason = (date: string, reason: string) => {
    setDayReasons((prev) => ({ ...prev, [date]: reason }));
  };

  const handleApplyStickyReasons = (newReasons: Record<string, string>) => {
    setDayReasons((prev) => ({ ...prev, ...newReasons }));
  };

  // Process rows
  const parsedRows = parseRows(rawInput);
  const classifiedList = parsedRows.map((r) => classifyDay(r, rules));

  // Late days and stats calculation
  const counts = { present: 0, absent: 0, overtime: 0, missing: 0, late: 0, excused: 0, wfh: 0 };
  let totalWorkedMin = 0;
  let totalOvertimeMins = 0;
  const breakdown = {
    absent: 0,
    weekend: 0,
    holiday: 0,
    leave: 0,
    excused: 0,
    overtime_manual: 0,
    wfh: 0,
  };

  const lateDaysList: typeof classifiedList = [];

  for (const c of classifiedList) {
    const isWeekendRow = weekdayOf(c.row.date, weekendDays).isWeekend;
    const isAbsent = c.status === 'absent';
    const hasOverride = overrides[c.row.date] !== undefined;
    const effectiveCat: DayCategory = hasOverride
      ? overrides[c.row.date]
      : isWeekendRow
      ? 'weekend'
      : isAbsent
      ? 'absent'
      : c.status === 'overtime'
      ? 'overtime_manual'
      : 'present';

    if (effectiveCat === 'wfh') {
      counts.wfh++;
      breakdown.wfh++;
      totalWorkedMin += c.workedMin > 0 ? c.workedMin : 8 * 60;
    } else if (effectiveCat === 'excused') {
      counts.excused++;
      breakdown.excused++;
      totalWorkedMin += c.workedMin > 0 ? c.workedMin : 8 * 60;
    } else if (effectiveCat === 'overtime_manual') {
      counts.overtime++;
      breakdown.overtime_manual++;
      const otMins = c.overtimeMin > 0 ? c.overtimeMin : 60;
      totalOvertimeMins += otMins;
      totalWorkedMin += c.workedMin > 0 ? c.workedMin : 8 * 60 + otMins;
    } else if (effectiveCat === 'leave') {
      breakdown.leave++;
    } else if (effectiveCat === 'holiday') {
      breakdown.holiday++;
    } else if (effectiveCat === 'weekend') {
      breakdown.weekend++;
    } else if (effectiveCat === 'absent') {
      counts.absent++;
      breakdown.absent++;
    } else if (effectiveCat === 'present') {
      if (c.status === 'missing') {
        counts.missing++;
      } else {
        counts.present++;
      }
      totalWorkedMin += c.workedMin;
    }

    const isLateEligible =
      c.isLate && !['weekend', 'holiday', 'leave', 'absent', 'wfh'].includes(effectiveCat);

    if (isLateEligible) {
      counts.late++;
      lateDaysList.push(c);
    }
  }

  const lateDays = lateDaysList;
  const workedDays = counts.present + counts.overtime + counts.excused + counts.wfh;
  const punctualityScore = workedDays > 0 ? Math.round(((workedDays - counts.late) / workedDays) * 100) : 100;

  // Overtime rows
  const overtimeList = classifiedList.filter((c) => {
    const isWeekendRow = weekdayOf(c.row.date, weekendDays).isWeekend;
    const isAbsent = c.status === 'absent';
    const effectiveCat = overrides[c.row.date] !== undefined
      ? overrides[c.row.date]
      : isWeekendRow
      ? 'weekend'
      : isAbsent
      ? 'absent'
      : c.status === 'overtime'
      ? 'overtime_manual'
      : 'present';
    return effectiveCat === 'overtime_manual';
  });

  const missingReasonsList = overtimeList.filter((c) => {
    const r = (dayReasons[c.row.date] || '').trim();
    return !r;
  });

  // Calculate unexcused absence days that require checkpoints/excuses
  const unexcusedAbsentList = classifiedList.filter((c) => {
    const isWeekendRow = weekdayOf(c.row.date, weekendDays).isWeekend;
    const isAbsent = c.status === 'absent';
    const effectiveCat = overrides[c.row.date] !== undefined
      ? overrides[c.row.date]
      : isWeekendRow
      ? 'weekend'
      : isAbsent
      ? 'absent'
      : c.status === 'overtime'
      ? 'overtime_manual'
      : 'present';
    return effectiveCat === 'absent';
  });

  const unresolvedAbsentList = unexcusedAbsentList.filter((c) => {
    const isChecked = absenceCheckpoints[c.row.date] === true || (dayReasons[c.row.date] || '').trim().length > 0;
    return !isChecked;
  });

  // Required Checklist Items
  const requiredItems = [
    { key: 'name', label: 'Employee Name', complete: exportSettings.name.trim().length > 0 },
    { key: 'employeeId', label: 'Employee ID', complete: exportSettings.employeeId.trim().length > 0 },
    { key: 'shiftEnd', label: 'Shift End Time', complete: exportSettings.shiftEnd.trim().length > 0 },
    { key: 'ledger', label: 'Ledger Days Loaded', complete: parsedRows.length > 0 },
  ];

  if (overtimeList.length > 0) {
    overtimeList.forEach((ot) => {
      const hasReason = (dayReasons[ot.row.date] || ot.userReason || '').trim().length > 0;
      requiredItems.push({
        key: `reason-${ot.row.date}`,
        label: `Reason for ${ot.row.date}`,
        complete: hasReason,
      });
    });
  }

  if (unexcusedAbsentList.length > 0) {
    unexcusedAbsentList.forEach((ab) => {
      const isChecked = absenceCheckpoints[ab.row.date] === true || (dayReasons[ab.row.date] || '').trim().length > 0;
      requiredItems.push({
        key: `absent-${ab.row.date}`,
        label: `Absence Checkpoint for ${ab.row.date}`,
        complete: isChecked,
      });
    });
  }

  const totalRequiredCount = requiredItems.length;
  const completedRequiredCount = requiredItems.filter((i) => i.complete).length;
  const completionPercentage = totalRequiredCount > 0
    ? Math.round((completedRequiredCount / totalRequiredCount) * 100)
    : 100;

  const missingDataErrors: { id: string; label: string; action?: () => void; actionLabel?: string }[] = [];
  if (!exportSettings.name.trim()) {
    missingDataErrors.push({ id: 'name', label: 'Employee Name is required — please enter your full name.' });
  }
  if (!exportSettings.employeeId.trim()) {
    missingDataErrors.push({ id: 'employeeId', label: 'Employee ID is required — please enter your Staff ID.' });
  }
  if (missingReasonsList.length > 0) {
    missingDataErrors.push({
      id: 'reasons',
      label: `${missingReasonsList.length} overtime ${
        missingReasonsList.length === 1 ? 'day is missing a mandatory reason' : 'days are missing mandatory reasons'
      }.`,
      action: () => {
        const tableEl = document.getElementById('ledger-breakdown-section');
        if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      actionLabel: 'Enter Overtime Reasons',
    });
  }
  if (unresolvedAbsentList.length > 0) {
    missingDataErrors.push({
      id: 'absent-checkpoints',
      label: `${unresolvedAbsentList.length} unexcused absence ${
        unresolvedAbsentList.length === 1 ? 'day requires a checkpoint or excuse' : 'days require checkpoints or excuses'
      }.`,
      action: () => {
        const tableEl = document.getElementById('ledger-breakdown-section');
        if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      actionLabel: 'Review Absent Checkpoints',
    });
  }

  const isUserDataComplete = missingDataErrors.length === 0;

  const handleExportOvertime = () => {
    const cleanId = exportSettings.employeeId.trim();
    const cleanName = exportSettings.name.trim();

    if (!cleanId || cleanId.toLowerCase() === 'employee id' || cleanId.toLowerCase() === 'sap id') {
      alert(t('val.cannot_export_sap'));
      const sapInput = document.querySelector('input[placeholder*="SAP"]') as HTMLInputElement;
      if (sapInput) {
        sapInput.focus();
        sapInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!cleanName || cleanName.toLowerCase() === 'employee name' || cleanName.toLowerCase() === 'no employee name set') {
      alert(t('val.cannot_export_name'));
      const nameInput = document.querySelector('input[placeholder*="Full name"]') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (overtimeList.length === 0) {
      alert(t('val.no_ot_export'));
      return;
    }

    if (missingReasonsList.length > 0) {
      alert(
        t('val.missing_reasons_export')
      );
      setIsStickyNotesOpen(true);
      return;
    }

    if (unresolvedAbsentList.length > 0) {
      alert(
        t('val.missing_absent_export')
      );
      const tableEl = document.getElementById('ledger-breakdown-section');
      if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const result = exportOvertimeToExcel(classifiedList, exportSettings, dayReasons, overrides, weekendDays);
    if (!result.success) {
      if (result.missingDates && result.missingDates.length > 0) {
        setIsStickyNotesOpen(true);
      }
      alert(result.error || 'Failed to export overtime log.');
    } else {
      showToast(`✓ Excel ledger successfully exported for ${exportSettings.name} (SAP #${exportSettings.employeeId})`);
    }
  };

  // Submit to Team Leader workflow
  const executeSubmissionSave = (isOverwriting: boolean = false) => {
    const submissionItems = overtimeList.map((ot) => {
      const isThu = weekdayOf(ot.row.date, weekendDays).label.toLowerCase() === 'thu';
      const isEarlyThu = (rules.thursdayEarlyShift ?? true);
      const thuShiftEnd = rules.thursdayShiftEnd || '16:00';
      const shiftEndStd = (isEarlyThu && isThu) ? thuShiftEnd : (exportSettings.shiftEnd || '17:00');
      return {
        date: ot.row.date,
        dayOfWeek: weekdayOf(ot.row.date, weekendDays).label,
        startTime: ot.row.start,
        endTime: ot.row.end,
        shiftEndStandard: shiftEndStd,
        overtimeMinutes: ot.overtimeMin > 0 ? ot.overtimeMin : 60,
        reason: dayReasons[ot.row.date] || ot.userReason || 'Project overtime',
        category: overrides[ot.row.date] || 'overtime_manual',
        status: 'pending' as const,
      };
    });

    const targetId = isOverwriting && duplicateWarningSubmission
      ? duplicateWarningSubmission.id
      : `sub_${exportSettings.employeeId}_${Date.now()}`;

    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const assignedTeam = getTeamForSapId(cleanId) || (exportSettings.teamId ? getTeamById(exportSettings.teamId) : undefined) || (currentUser.teamId ? getTeamById(currentUser.teamId) : undefined) || getTeams()[0];
    
    const isTeamLeader = (assignedTeam && normalizeEmployeeId(assignedTeam.leaderSapId) === cleanId) || currentUser.role === 'team_leader';
    const managerName = assignedTeam?.managerName || exportSettings.managerName || currentUser.managerName || 'Operations Director';
    const managerSapId = assignedTeam?.managerSapId || exportSettings.managerSapId || currentUser.managerSapId || '1001';
    const teamLeaderName = isTeamLeader ? undefined : (assignedTeam?.leaderName || exportSettings.teamLeaderName || currentUser.teamLeaderName || 'Team Leader');
    const teamLeaderSapId = isTeamLeader ? undefined : (assignedTeam?.leaderSapId || exportSettings.teamLeaderSapId || currentUser.teamLeaderSapId || '2001');
    const teamName = assignedTeam?.name || exportSettings.teamName || currentUser.teamName || 'Operations Team Alpha';
    const teamId = assignedTeam?.id || exportSettings.teamId || currentUser.teamId || 'team_1';

    const newSubmission: OvertimeSubmission = {
      id: targetId,
      employeeId: cleanId,
      employeeName: exportSettings.name.trim() || 'Staff Employee',
      submitterRole: isTeamLeader ? 'team_leader' : 'employee',
      department: assignedTeam?.department || currentUser.department || 'Operations & Facilities',
      teamId: teamId,
      teamName: teamName,
      teamLeaderSapId: teamLeaderSapId,
      teamLeaderName: teamLeaderName,
      managerSapId: managerSapId,
      managerName: managerName,
      periodLabel: '16th – 15th Monthly Cycle',
      totalOvertimeMinutes: totalOvertimeMins,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      items: submissionItems,
    };

    saveSubmission(newSubmission);
    setDuplicateWarningSubmission(null);
    showToast(
      isTeamLeader
        ? (isOverwriting
            ? `✓ Updated request for Team Leader ${exportSettings.name} submitted to Reporting Manager: ${managerName} (${teamName})!`
            : `✓ Submitted ${submissionItems.length} overtime day(s) for Team Leader ${exportSettings.name} directly to Reporting Manager: ${managerName} (${teamName})!`)
        : (isOverwriting
            ? `✓ Updated request for ${exportSettings.name} submitted to Team Leader: ${teamLeaderName} (${teamName})!`
            : `✓ Submitted ${submissionItems.length} overtime day(s) for ${exportSettings.name} directly to Team Leader: ${teamLeaderName} (${teamName})!`)
    );
    
    // Only switch tabs if the current user has permission to review
    if (currentUser.role === 'team_leader') {
      handleMainTabChange('team_leader_approvals');
    } else if (currentUser.role === 'manager' || currentUser.role === 'admin') {
      handleMainTabChange('manager_overview');
    }
  };

  const handleSubmitToTeamLeader = () => {
    if (overtimeList.length === 0) {
      alert('No overtime days detected in this timesheet to submit.');
      return;
    }

    if (missingReasonsList.length > 0) {
      alert(`Cannot submit to Team Leader: Please enter mandatory reasons for all ${missingReasonsList.length} overtime day(s).`);
      const tableEl = document.getElementById('ledger-breakdown-section');
      if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (!exportSettings.name.trim() || !exportSettings.employeeId.trim()) {
      alert('Please fill your Employee Name and SAP ID before submitting.');
      return;
    }

    // DUPLICATE SUBMISSION CHECK:
    // Prevent duplicate requests and avoid conflicts for the team leader.
    const cleanId = exportSettings.employeeId.trim();
    const cleanName = exportSettings.name.trim().toLowerCase();
    
    const existing = allSubmissions.find((s) => {
      const sameId = s.employeeId.trim() === cleanId;
      const sameName = s.employeeName.trim().toLowerCase() === cleanName;
      return sameId || sameName;
    });

    if (existing) {
      // Prompt warning modal before overwriting to protect team leader queue from duplicates
      setDuplicateWarningSubmission(existing);
      return;
    }

    executeSubmissionSave(false);
  };

  const activeUserSubmission = allSubmissions.find(
    (s) =>
      (exportSettings.employeeId && s.employeeId === exportSettings.employeeId) ||
      (exportSettings.name && s.employeeName.toLowerCase() === exportSettings.name.trim().toLowerCase())
  );

  const validateIdentity = (showAlert: boolean = true): boolean => {
    const cleanId = exportSettings.employeeId.trim();
    const cleanName = exportSettings.name.trim();

    if (!cleanId) {
      if (showAlert) {
        alert(t('val.missing_identity'));
        setActiveTab('employee_ledger');
        setLedgerSection('section1');
        setTimeout(() => {
          const sapInput = document.getElementById('sap-input-field') as HTMLInputElement;
          if (sapInput) {
            sapInput.focus();
            sapInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return false;
    }

    if (!/^[0-9]+$/.test(cleanId)) {
      if (showAlert) {
        alert(t('val.invalid_sap_numeric'));
        setActiveTab('employee_ledger');
        setLedgerSection('section1');
        setTimeout(() => {
          const sapInput = document.getElementById('sap-input-field') as HTMLInputElement;
          if (sapInput) {
            sapInput.focus();
            sapInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return false;
    }

    if (!cleanName || cleanName.toLowerCase() === 'employee name' || cleanName.toLowerCase() === 'no employee name set' || cleanName.toLowerCase() === 'name') {
      if (showAlert) {
        alert(t('val.missing_identity'));
        setActiveTab('employee_ledger');
        setLedgerSection('section1');
        setTimeout(() => {
          const nameInput = document.getElementById('name-input-field') as HTMLInputElement;
          if (nameInput) {
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      return false;
    }

    return true;
  };

  const handleMainTabChange = (newTab: ActiveAppTab) => {
    if (newTab !== 'employee_ledger') {
      if (!validateIdentity(true)) {
        return;
      }
    }
    setActiveTab(newTab);
  };

  const handleOpenDatabase = () => {
    if (!validateIdentity(true)) {
      return;
    }
    setIsDatabaseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors py-8 sm:py-10 px-4 sm:px-6 lg:px-10">
      <div className="max-w-7xl 2xl:max-w-[1560px] mx-auto space-y-8 lg:space-y-10">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-2.5 animate-bounce">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Masthead Header with Tabs & Multi-Role Navigation */}
        <Masthead
          theme={theme}
          onToggleTheme={toggleTheme}
          onResetSession={handleResetSession}
          activeTab={activeTab}
          onChangeTab={handleMainTabChange}
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
          onOpenDatabaseModal={handleOpenDatabase}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* TAB 1: EMPLOYEE TIMESHEET & OVERTIME LEDGER (3-SECTION DEDICATED ARCHITECTURE) */}
        {activeTab === 'employee_ledger' && (() => {
          const cleanEmployeeId = normalizeEmployeeId(exportSettings.employeeId);
          const assignedTeam = (exportSettings.teamId ? getTeamById(exportSettings.teamId) : undefined) || getTeamForSapId(cleanEmployeeId) || (currentUser.teamId ? getTeamById(currentUser.teamId) : undefined) || getTeams()[0];
          const assignedTeamLeaderName = assignedTeam?.leaderName || exportSettings.teamLeaderName || currentUser.teamLeaderName || 'Unassigned (No Team Leader)';
          const assignedTeamLeaderSapId = assignedTeam?.leaderSapId || exportSettings.teamLeaderSapId || currentUser.teamLeaderSapId || '';
          const assignedTeamName = assignedTeam?.name || exportSettings.teamName || currentUser.teamName || 'Unassigned Team';

          const isSapValid = Boolean(
            exportSettings.employeeId?.trim() &&
            /^[0-9]+$/.test(exportSettings.employeeId.trim())
          );
          const isNameValid = Boolean(
            exportSettings.name?.trim() &&
            exportSettings.name.trim().toLowerCase() !== 'employee name' &&
            exportSettings.name.trim().toLowerCase() !== 'no employee name set'
          );
          const isPunchDataValid = Boolean(parsedRows.length > 0);
          const isOvertimeReasonsValid = Boolean(missingReasonsList.length === 0);
          const isAbsencesValid = Boolean(unresolvedAbsentList.length === 0);

          const completedChecklistCount = [
            isSapValid,
            isNameValid,
            isPunchDataValid,
            isOvertimeReasonsValid,
            isAbsencesValid,
          ].filter(Boolean).length;
          const readinessPercent = Math.round((completedChecklistCount / 5) * 100);

          const handleNavigateSection = (sectionId: 'section1' | 'section2' | 'section3', targetElementId?: string) => {
            setLedgerSection(sectionId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (targetElementId) {
              setTimeout(() => {
                const el = document.getElementById(targetElementId);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                    el.focus();
                  }
                  const highlightBox = el.closest('.border') || el;
                  if (highlightBox) {
                    highlightBox.classList.add('ring-4', 'ring-amber-500/80', 'ring-offset-2', 'transition-all');
                    setTimeout(() => {
                      highlightBox.classList.remove('ring-4', 'ring-amber-500/80', 'ring-offset-2');
                    }, 2500);
                  }
                }
              }, 150);
            }
          };

          return (
            <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
              {/* SECTION NAVIGATION BAR (3 DEDICATED SECTIONS) */}
              <div className="bg-card border border-border rounded-3xl p-3 sm:p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Tab Button 1: Section 1 */}
                  <button
                    type="button"
                    onClick={() => handleNavigateSection('section1')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      ledgerSection === 'section1'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-xs'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-sm ${
                          ledgerSection === 'section1'
                            ? 'bg-amber-500 text-black'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        1
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-foreground truncate">
                          {t('section.sec1_tab', 'Section 1: Data Entry & Setup')}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          Profile, Rules & Punches
                        </div>
                      </div>
                    </div>
                    {isSapValid && isNameValid && isPunchDataValid ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs">
                        ✓
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                  </button>

                  {/* Tab Button 2: Section 2 */}
                  <button
                    type="button"
                    onClick={() => handleNavigateSection('section2')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      ledgerSection === 'section2'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-xs'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-sm ${
                          ledgerSection === 'section2'
                            ? 'bg-amber-500 text-black'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        2
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-foreground truncate">
                          {t('section.sec2_tab', 'Section 2: Processed RAW Data')}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          {parsedRows.length > 0 ? `${parsedRows.length} Days Processed` : 'Ledger Table & Metrics'}
                        </div>
                      </div>
                    </div>
                    {parsedRows.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-foreground font-bold border border-border shrink-0">
                        {parsedRows.length}d
                      </span>
                    )}
                  </button>

                  {/* Tab Button 3: Section 3 */}
                  <button
                    type="button"
                    onClick={() => handleNavigateSection('section3')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      ledgerSection === 'section3'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-xs'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-sm ${
                          readinessPercent === 100
                            ? 'bg-emerald-500 text-black'
                            : ledgerSection === 'section3'
                            ? 'bg-amber-500 text-black'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        3
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-foreground truncate">
                          {t('section.sec3_tab', 'Section 3: Verification & Export')}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          Readiness Bar & Excel Hub
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border shrink-0 ${
                        readinessPercent === 100
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {readinessPercent}%
                    </span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECTION 1: DATA ENTRY & SETUP HUB                         */}
              {/* ========================================================= */}
              {ledgerSection === 'section1' && (
                <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                  {/* Step 1.1: Export Overtime Log (Employee Profile & Approver) */}
                  <div className="w-full">
                    <ProfileCard
                      exportSettings={exportSettings}
                      onChangeSettings={handleChangeExportSettings}
                      onOpenStickyNotes={() => setIsStickyNotesOpen(true)}
                      onOpenDirectory={() => setIsDirectoryOpen(true)}
                      currentUser={currentUser}
                    />
                  </div>

                  {/* Step 1.2: Attendance & Overtime Rules Engine */}
                  <div className="w-full shadow-xs">
                    <RulesCard
                      rules={rules}
                      onChangeRules={setRules}
                    />
                  </div>

                  {/* Step 1.3: Raw Attendance Punch Ledger */}
                  <div className="w-full">
                    <RawInputCard
                      rawInput={rawInput}
                      onChangeInput={setRawInput}
                      onRun={() => {
                        handleNavigateSection('section2');
                      }}
                    />
                  </div>

                  {/* Section 1 Next Step Footer */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleNavigateSection('section2')}
                      className="w-full sm:w-auto px-7 py-4 bg-amber-500 hover:bg-amber-400 text-black font-mono text-sm font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <span>{t('section.next_sec2', 'Continue to Section 2: Processed RAW Data →')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SECTION 2: DATA THAT CAME FROM RAW DATA                   */}
              {/* ========================================================= */}
              {ledgerSection === 'section2' && (
                <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300" id="ledger-results-section">
                  {parsedRows.length > 0 ? (
                    <>
                      {/* Summary Metric Counters */}
                      <SummaryCard
                        totalDays={parsedRows.length}
                        counts={counts}
                        totalOvertimeMins={totalOvertimeMins}
                        breakdown={breakdown}
                        weekendDays={weekendDays}
                        onToggleWeekendDay={handleToggleWeekendDay}
                        onSetWeekendDays={handleSetWeekendDays}
                      />

                      {/* Late Arrival Banner if applicable */}
                      {lateDays.length > 0 && (
                        <LateAlertBanner
                          lateDays={lateDays}
                          lateThresholdVal={rules.lateVal}
                          permissionsFiled={permissionsFiled}
                          onTogglePermission={handleTogglePermission}
                          employeeName={exportSettings.name}
                          employeeId={exportSettings.employeeId}
                        />
                      )}

                      {/* Submission Status Alert if submitted */}
                      {activeUserSubmission && (
                        <EmployeeSubmissionStatus
                          submission={activeUserSubmission}
                          employeeName={exportSettings.name}
                          employeeId={exportSettings.employeeId}
                          onNavigateToApprovals={() => handleMainTabChange('team_leader_approvals')}
                          onSubmitNew={handleSubmitToTeamLeader}
                          onExport={handleExportOvertime}
                          overtimeCount={counts.overtime}
                          currentUserRole={currentUser.role}
                          assignedTeamName={assignedTeamName}
                          assignedTeamLeaderName={assignedTeamLeaderName}
                          assignedTeamLeaderSapId={assignedTeamLeaderSapId}
                        />
                      )}

                      {/* Interactive Day-by-Day Timesheet Table */}
                      <DayTable
                        classifiedList={classifiedList}
                        overrides={overrides}
                        onUpdateOverride={handleUpdateOverride}
                        rules={rules}
                        permissionsFiled={permissionsFiled}
                        onTogglePermission={handleTogglePermission}
                        dayReasons={dayReasons}
                        onUpdateReason={handleUpdateReason}
                        weekendDays={weekendDays}
                        absenceCheckpoints={absenceCheckpoints}
                        onToggleAbsenceCheckpoint={handleToggleAbsenceCheckpoint}
                        activeSubmission={activeUserSubmission}
                      />
                    </>
                  ) : (
                    <div className="text-center py-20 px-8 border-2 border-dashed border-border/80 rounded-3xl bg-muted/10">
                      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold font-mono text-foreground mb-2">
                        No Attendance Punch Logs Loaded
                      </h3>
                      <p className="text-sm font-mono text-muted-foreground max-w-lg mx-auto leading-relaxed mb-6">
                        Paste your biometric attendance punch logs in Section 1 and click <span className="text-amber-500 font-bold">"Read the ledger"</span> to view your calculated overtime and timesheet breakdown here.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNavigateSection('section1', 'raw-punch-input-section')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('section.back_sec1', '← Go to Section 1: Data Entry & Setup')}</span>
                      </button>
                    </div>
                  )}

                  {/* Section 2 Navigation Footer */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => handleNavigateSection('section1')}
                      className="w-full sm:w-auto px-6 py-3.5 bg-muted hover:bg-muted/80 text-foreground font-mono text-xs font-bold uppercase tracking-wider rounded-2xl border border-border transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('section.back_sec1', '← Back to Section 1: Data Entry & Setup')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigateSection('section3')}
                      className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{t('section.next_sec3', 'Continue to Section 3: Verification & Export →')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SECTION 3: VERIFICATION & EXPORT HUB                      */}
              {/* ========================================================= */}
              {ledgerSection === 'section3' && (
                <div className="space-y-8 lg:space-y-10 animate-in fade-in duration-300">
                  {/* Verification & Export Hub Component */}
                  <VerificationExportCard
                    exportSettings={exportSettings}
                    overtimeCount={counts.overtime}
                    missingReasonsCount={missingReasonsList.length}
                    unresolvedAbsencesCount={unresolvedAbsentList.length}
                    hasPunchData={parsedRows.length > 0}
                    totalPunchesCount={parsedRows.length}
                    missingReasonsList={missingReasonsList}
                    unresolvedAbsentList={unresolvedAbsentList}
                    onOpenStickyNotes={() => setIsStickyNotesOpen(true)}
                    onNavigateSection={handleNavigateSection}
                    onExport={handleExportOvertime}
                    onSubmitToTeamLeader={handleSubmitToTeamLeader}
                    currentUser={currentUser}
                  />

                  {/* Section 3 Navigation Footer */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => handleNavigateSection('section1')}
                      className="w-full sm:w-auto px-6 py-3.5 bg-muted hover:bg-muted/80 text-foreground font-mono text-xs font-bold uppercase tracking-wider rounded-2xl border border-border transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('section.back_sec1', '← Section 1: Data Entry & Setup')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigateSection('section2')}
                      className="w-full sm:w-auto px-6 py-3.5 bg-muted hover:bg-muted/80 text-foreground font-mono text-xs font-bold uppercase tracking-wider rounded-2xl border border-border transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('section.back_sec2', '← Section 2: Processed RAW Data')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 2: TEAM LEADER APPROVALS */}
        {activeTab === 'team_leader_approvals' && (
          <TeamLeaderApprovals currentUser={currentUser} onNavigateTab={handleMainTabChange} />
        )}

        {/* TAB 3: MANAGER OVERVIEW & MATRIX */}
        {activeTab === 'manager_overview' && (
          <ManagerOverview currentUser={currentUser} onNavigateTab={handleMainTabChange} />
        )}

        {/* Footer Branding & Watermark */}
        <footer className="mt-12 mb-20 text-center text-[11px] font-mono text-muted-foreground/70 flex items-center justify-center gap-2 flex-wrap">
          <span>{t('footer.text')}</span>
          <span className="text-border">•</span>
          <span className="text-amber-400 font-bold uppercase tracking-wider">{t('brand.made_by')}</span>
        </footer>
      </div>

      {/* Floating Bottom Navigation Dock - Pinned and Always Accessible */}
      <FloatingPortalDock
        activeTab={activeTab}
        onChangeTab={handleMainTabChange}
        onOpenDatabase={handleOpenDatabase}
        pendingApprovalsCount={pendingApprovalsCount}
        currentUser={currentUser}
      />

      {/* Staff Directory Modal */}
      <EmployeeDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        onSelectEmployee={(id, name) => {
          setExportSettings((prev) => ({ ...prev, employeeId: id, name }));
        }}
        currentId={exportSettings.employeeId}
      />

      {/* Sticky Notes Modal */}
      <StickyNotesModal
        isOpen={isStickyNotesOpen}
        onClose={() => setIsStickyNotesOpen(false)}
        onApplyReasons={handleApplyStickyReasons}
        overtimeDates={overtimeList.map((ot) => ot.row.date)}
        existingReasons={dayReasons}
      />

      {/* XAMPP / MySQL Database & User Management Modal */}
      <XamppDatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        currentUser={currentUser}
        onUserSelect={handleSwitchUser}
      />

      {/* Duplicate Submission Warning Modal */}
      {duplicateWarningSubmission && (
        <DuplicateSubmissionModal
          isOpen={Boolean(duplicateWarningSubmission)}
          onClose={() => setDuplicateWarningSubmission(null)}
          onConfirmOverwrite={() => executeSubmissionSave(true)}
          existingSubmission={duplicateWarningSubmission}
          newOvertimeCount={counts.overtime}
          newTotalOvertimeMinutes={totalOvertimeMins}
          employeeName={exportSettings.name}
          employeeId={exportSettings.employeeId}
          onNavigateToLeaderTab={() => {
            setDuplicateWarningSubmission(null);
            handleMainTabChange('team_leader_approvals');
          }}
          canViewLeaderTab={currentUser.role !== 'employee'}
        />
      )}
    </div>
  );
}
