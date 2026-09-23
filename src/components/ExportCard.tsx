import React from 'react';
import { ExportSettings, UserProfile } from '../types';
import {
  FileSpreadsheet,
  User,
  Hash,
  Clock,
  StickyNote,
  AlertCircle,
  CheckCircle,
  X,
  RotateCcw,
  AlertTriangle,
  Database,
  Check,
  BarChart3,
  Lock,
  ShieldCheck,
  Download,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  saveEmployeeMapping,
  normalizeEmployeeId,
} from '../utils/employeeDirectory';
import { getTeamForSapId } from '../utils/teamDatabase';
import { useLanguage } from '../i18n/LanguageContext';

interface ExportCardProps {
  exportSettings: ExportSettings;
  onChangeSettings: (settings: ExportSettings) => void;
  onExport: () => void;
  onSubmitToTeamLeader?: () => void;
  onNavigateTab?: (tab: 'team_leader_approvals' | 'manager_overview' | 'employee_ledger') => void;
  overtimeCount: number;
  missingReasonsCount: number;
  unresolvedAbsencesCount?: number;
  hasPunchData?: boolean;
  totalPunchesCount?: number;
  missingReasonsList?: string[];
  unresolvedAbsentList?: string[];
  onOpenStickyNotes: () => void;
  onOpenDirectory?: () => void;
  currentUser?: UserProfile;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  exportSettings,
  onChangeSettings,
  onExport,
  onSubmitToTeamLeader,
  onNavigateTab,
  overtimeCount,
  missingReasonsCount,
  unresolvedAbsencesCount = 0,
  hasPunchData = false,
  totalPunchesCount = 0,
  missingReasonsList = [],
  unresolvedAbsentList = [],
  onOpenStickyNotes,
  onOpenDirectory,
  currentUser,
}) => {
  const { t } = useLanguage();

  // Handle SAP / Employee ID Input with Strict Numeric Enforcement
  const handleIdChange = (rawId: string) => {
    // Strictly enforce numeric digits only
    const numericId = rawId.replace(/[^0-9]/g, '');

    if (!numericId) {
      onChangeSettings({
        ...exportSettings,
        employeeId: '',
      });
      return;
    }

    const team = getTeamForSapId(numericId);
    onChangeSettings({
      ...exportSettings,
      employeeId: numericId,
      teamId: team?.id || exportSettings.teamId,
      teamName: team?.name || exportSettings.teamName,
      teamLeaderSapId: team?.leaderSapId || exportSettings.teamLeaderSapId,
      teamLeaderName: team?.leaderName || exportSettings.teamLeaderName,
    });
  };

  // Handle Employee Name change (Strict Letters Only - accepts English and Arabic characters)
  const handleNameChange = (rawName: string) => {
    // Strip digits only, preserving letters in all languages
    const lettersOnlyName = rawName.replace(/[0-9\d]/g, '');
    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const team = getTeamForSapId(cleanId);

    onChangeSettings({
      ...exportSettings,
      name: lettersOnlyName,
      teamId: exportSettings.teamId || team?.id,
      teamName: exportSettings.teamName || team?.name,
      teamLeaderSapId: exportSettings.teamLeaderSapId || team?.leaderSapId,
      teamLeaderName: exportSettings.teamLeaderName || team?.leaderName,
    });
  };

  const handleBlurSave = () => {
    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const cleanName = exportSettings.name.trim();
    const team = getTeamForSapId(cleanId);
    if (cleanId && cleanName) {
      saveEmployeeMapping(cleanId, cleanName, {
        teamId: exportSettings.teamId || team?.id,
        teamName: exportSettings.teamName || team?.name,
        teamLeaderSapId: exportSettings.teamLeaderSapId || team?.leaderSapId,
        teamLeaderName: exportSettings.teamLeaderName || team?.leaderName,
      });
    }
  };

  const handleClearId = () => {
    onChangeSettings({
      ...exportSettings,
      employeeId: '',
    });
  };

  const handleClearName = () => {
    onChangeSettings({
      ...exportSettings,
      name: '',
    });
  };

  const update = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onChangeSettings({ ...exportSettings, [key]: value });
  };

  const isSapValid = Boolean(
    exportSettings.employeeId?.trim() &&
    /^[0-9]+$/.test(exportSettings.employeeId.trim())
  );

  const isNameValid = Boolean(
    exportSettings.name?.trim() &&
    exportSettings.name.trim().toLowerCase() !== 'employee name' &&
    exportSettings.name.trim().toLowerCase() !== 'no employee name set'
  );

  const isPunchDataValid = Boolean(hasPunchData && totalPunchesCount > 0);
  const isOvertimeReasonsValid = Boolean(missingReasonsCount === 0);
  const isAbsencesValid = Boolean(unresolvedAbsencesCount === 0);

  // 5 Mandatory Checklist Criteria for Export Readiness
  const criteriaList = [
    {
      id: 'sap',
      title: t('export.sap_label', 'Numeric SAP #'),
      isValid: isSapValid,
      missingMessage: 'Enter valid numeric SAP ID (digits only)',
    },
    {
      id: 'name',
      title: t('export.name_label', 'Employee Full Name'),
      isValid: isNameValid,
      missingMessage: 'Enter full employee name',
    },
    {
      id: 'punches',
      title: t('export.sec2_punches', 'Attendance Punches'),
      isValid: isPunchDataValid,
      missingMessage: 'Paste raw punch logs in Section 3 and click "Read the ledger"',
    },
    {
      id: 'reasons',
      title: t('export.sec3_ot', 'Overtime Reasons'),
      isValid: isOvertimeReasonsValid,
      missingMessage: `${missingReasonsCount} overtime day(s) missing mandatory justification`,
    },
    {
      id: 'absences',
      title: t('export.sec4_absent', 'Absence Checkpoints'),
      isValid: isAbsencesValid,
      missingMessage: `${unresolvedAbsencesCount} unexcused absence day(s) require excuse or checkpoint verification`,
    },
  ];

  const completedCount = criteriaList.filter((c) => c.isValid).length;
  const totalCount = criteriaList.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isReady100 = progressPercent === 100;

  const missingItems = criteriaList.filter((c) => !c.isValid);

  const rawTeam = exportSettings.employeeId ? getTeamForSapId(exportSettings.employeeId) : null;
  const isSubmitterLeader = (rawTeam && normalizeEmployeeId(rawTeam.leaderSapId) === normalizeEmployeeId(exportSettings.employeeId)) || currentUser?.role === 'team_leader';

  const assignedTeam = exportSettings.teamName 
    ? { 
        name: exportSettings.teamName, 
        leaderName: exportSettings.teamLeaderName, 
        leaderSapId: exportSettings.teamLeaderSapId,
        managerName: exportSettings.managerName,
        managerSapId: exportSettings.managerSapId
      }
    : rawTeam;

  const assignedApproverName = isSubmitterLeader
    ? (assignedTeam?.managerName || exportSettings.managerName || 'Operations Director')
    : (assignedTeam?.leaderName || exportSettings.teamLeaderName || 'Team Leader');

  const assignedApproverSap = isSubmitterLeader
    ? (assignedTeam?.managerSapId || exportSettings.managerSapId || '1001')
    : (assignedTeam?.leaderSapId || exportSettings.teamLeaderSapId || '2001');

  const assignedApproverRole = isSubmitterLeader ? t('role.manager', 'Reporting Manager') : t('role.team_leader', 'Team Leader');

  return (
    <div className="bg-card border-2 border-primary/40 rounded-3xl p-7 sm:p-8 lg:p-9 shadow-lg flex flex-col justify-between h-full gap-7">
      {/* Card Header & Quick Tools */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
                {t('export.card_title', 'Export Overtime Log')}
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Mandatory employee profile, verification checklist & Excel exporter
              </p>
            </div>
          </div>

          {/* Quick Helper Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenDirectory && (
              <button
                type="button"
                onClick={onOpenDirectory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-muted/60 hover:bg-muted text-foreground border border-border transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                title="Manage local employee database"
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('export.emp_db', 'Employee DB')}</span>
              </button>
            )}

            {(exportSettings.employeeId || exportSettings.name) && (
              <button
                type="button"
                onClick={handleClearId}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                title="Clear entered ID & Name"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('export.reset_profile', 'Reset Profile')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenStickyNotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              title="Import overtime reasons from Sticky Notes"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>{t('export.sticky_notes', 'Sticky Notes')}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: MANDATORY EMPLOYEE IDENTITY & SHIFT PARAMETERS */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
                {t('export.sec1_identity', '1. Employee Identity & Parameters')}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {t('export.mandatory_badge', 'Mandatory')}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{assignedApproverRole}: {assignedApproverName} (SAP #{assignedApproverSap})</span>
            </div>
          </div>

          {/* 3 Dedicated Parameter Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Block 1: SAP ID with Strict Numeric Input */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-w-0 relative ${
                isSapValid ? 'bg-muted/20 border-border' : 'bg-rose-500/10 border-rose-500/40 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                  <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t('export.sap_label', 'SAP # (Numeric Only)')}</span>
                </label>
                {isSapValid ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                      {t('export.sap_valid', '✓ Valid SAP')}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearId}
                      className="p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete / Clear SAP ID"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 shrink-0 whitespace-nowrap animate-pulse">
                    {t('export.sap_numbers_only', '⚠️ Numbers Only')}
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={exportSettings.employeeId}
                  onChange={(e) => handleIdChange(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder={t('export.sap_placeholder', 'e.g. 10425')}
                  className={`w-full min-w-0 bg-background rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-mono text-foreground focus:outline-hidden transition-all ${
                    isSapValid
                      ? 'border border-border focus:border-amber-500'
                      : 'border-2 border-rose-500 focus:border-rose-400 placeholder:text-rose-400/60'
                  }`}
                />
                {exportSettings.employeeId && (
                  <button
                    type="button"
                    onClick={handleClearId}
                    className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-muted transition-colors cursor-pointer"
                    title="Clear entered number"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Block 2: Employee Name */}
            <div
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-w-0 ${
                isNameValid ? 'bg-muted/20 border-border' : 'bg-rose-500/10 border-rose-500/40 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t('export.name_label', 'Full Employee Name')}</span>
                </label>
                {isNameValid ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                      {t('export.name_set', '✓ Set')}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearName}
                      className="p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete / Clear Employee Name"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 shrink-0 whitespace-nowrap animate-pulse">
                    {t('export.name_type', '⚠️ Type Name')}
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={exportSettings.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder={t('export.name_placeholder', 'e.g. David Kalad')}
                  className={`w-full min-w-0 bg-background rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-mono text-foreground focus:outline-hidden transition-all ${
                    isNameValid
                      ? 'border border-border focus:border-amber-500'
                      : 'border-2 border-rose-500 focus:border-rose-400 placeholder:text-rose-400/60'
                  }`}
                />
                {exportSettings.name && (
                  <button
                    type="button"
                    onClick={handleClearName}
                    className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-muted transition-colors cursor-pointer"
                    title="Delete / Clear name"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Block 3: Shift End ("From" Time) */}
            <div className="p-5 rounded-2xl border border-border bg-muted/20 flex flex-col justify-between min-w-0 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between gap-2 mb-3">
                <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{t('export.shift_end_label', 'Shift End Time')}</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                  {t('export.name_set', '✓ Set')}
                </span>
              </div>

              <div>
                <input
                  type="time"
                  value={exportSettings.shiftEnd}
                  onChange={(e) => update('shiftEnd', e.target.value)}
                  className="w-full min-w-0 bg-background border border-border focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: 4-SECTION MANDATORY CHECKLIST GRID */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
              {t('export.readiness_title', 'Mandatory Export Verification Checklist')}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {completedCount} / {totalCount} Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Check 1: Identity */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isSapValid && isNameValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSapValid && isNameValid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-mono text-xs font-bold truncate">
                  {t('export.sec1_identity', '1. Employee ID & Name')}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                {isSapValid && isNameValid ? `${exportSettings.name} (#${exportSettings.employeeId})` : 'SAP & Name Required'}
              </p>
            </div>

            {/* Check 2: Punches */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isPunchDataValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isPunchDataValid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-mono text-xs font-bold truncate">
                  {t('export.sec2_punches', '2. Attendance Punches')}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                {isPunchDataValid ? `${totalPunchesCount} days loaded in ledger` : 'Punch logs required'}
              </p>
            </div>

            {/* Check 3: Overtime Reasons */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isOvertimeReasonsValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOvertimeReasonsValid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-mono text-xs font-bold truncate">
                  {t('export.sec3_ot', '3. Overtime Reasons')}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                {isOvertimeReasonsValid
                  ? `${overtimeCount} overtime days documented`
                  : `${missingReasonsCount} reason(s) missing`}
              </p>
            </div>

            {/* Check 4: Absence Checkpoints */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                isAbsencesValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {isAbsencesValid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-mono text-xs font-bold truncate">
                  {t('export.sec4_absent', '4. Absence Checkpoints')}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                {isAbsencesValid ? 'All absences resolved' : `${unresolvedAbsencesCount} checkpoint(s) needed`}
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROMINENT 0-100% EXPORT READINESS PROGRESS BAR */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isReady100
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
              : 'bg-muted/30 border-border/90'
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              {isReady100 ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
              )}
              <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                {isReady100
                  ? t('export.ready_100', '100% Ready — All Requirements Satisfied')
                  : `${t('export.progress_label', 'Export Readiness Progress')}: ${progressPercent}%`}
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border ${
                isReady100
                  ? 'bg-emerald-500 text-black border-emerald-500 shadow-xs'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {progressPercent}%
            </span>
          </div>

          {/* Visual Progress Bar with Fluid Animation */}
          <div className="w-full bg-muted/70 rounded-full h-4 p-0.5 overflow-hidden border border-border/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isReady100
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : progressPercent >= 60
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>

          {/* Missing Items Callout List */}
          {!isReady100 ? (
            <div className="mt-4 pt-3.5 border-t border-border/60">
              <div className="text-xs font-mono text-amber-400 font-bold mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t('export.missing_banner').replace('{count}', String(missingItems.length))}</span>
              </div>
              <ul className="space-y-1.5">
                {missingItems.map((item) => (
                  <li key={item.id} className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-foreground font-semibold">{item.title}:</span>
                    <span>{item.missingMessage}</span>
                  </li>
                ))}
              </ul>
              {missingReasonsCount > 0 && isSapValid && isNameValid && (
                <div className="mt-3.5 flex justify-end">
                  <button
                    type="button"
                    onClick={onOpenStickyNotes}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 shrink-0 shadow-md cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {t('export.fill_sticky', 'Fill with Sticky Notes')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3.5 text-xs font-mono text-emerald-400 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {t('export.all_verified')
                  .replace('{sap}', exportSettings.employeeId)
                  .replace('{name}', exportSettings.name)
                  .replace('{count}', String(overtimeCount))} {assignedTeam ? `(${assignedTeam.name})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: MAIN ACTION BUTTONS (GATED ON 100% READINESS) */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {onSubmitToTeamLeader && (
          <button
            type="button"
            disabled={!isReady100 || overtimeCount === 0}
            onClick={onSubmitToTeamLeader}
            className={`w-full py-4 px-6 font-mono text-sm font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 ${
              !isReady100 || overtimeCount === 0
                ? 'bg-muted/50 text-muted-foreground border border-border cursor-not-allowed opacity-60'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-[0.99] cursor-pointer'
            }`}
          >
            {!isReady100 ? (
              <Lock className="w-4 h-4 shrink-0 text-muted-foreground" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">
              {!isReady100
                ? `${t('export.complete_missing', 'Complete Missing')} (${progressPercent}%)`
                : `${isSubmitterLeader ? t('export.submit_to_mgr', 'Submit to Manager:') : t('export.submit_btn', 'Submit to Team Leader:')} ${assignedApproverName} (${overtimeCount} ${t('rules.hrs', 'hrs')})`}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={!isReady100 || overtimeCount === 0}
          onClick={() => {
            if (!isSapValid) {
              alert(t('val.invalid_sap_numeric', 'Valid numeric SAP ID is required.'));
              return;
            }
            if (!isNameValid) {
              alert(t('val.cannot_export_name', 'Employee Full Name is required.'));
              return;
            }
            if (!isReady100) {
              alert(t('val.missing_reasons_export', 'Complete 100% of the checklist items before exporting.'));
              return;
            }
            if (overtimeCount === 0) {
              alert(t('val.no_ot_export', 'No overtime hours in current ledger to export.'));
              return;
            }
            onExport();
          }}
          className={`w-full py-4 px-6 font-mono text-sm font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 ${
            !isReady100 || overtimeCount === 0
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 cursor-not-allowed opacity-60'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.99] cursor-pointer'
          } ${!onSubmitToTeamLeader ? 'sm:col-span-2' : ''}`}
          title={!isReady100 ? 'Complete 100% of mandatory requirements to unlock Excel export' : 'Export Overtime Excel Sheet'}
        >
          {!isReady100 ? (
            <Lock className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <Download className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate">
            {!isReady100
              ? `${t('export.complete_missing', 'Complete Missing')} (${progressPercent}%)`
              : overtimeCount === 0
              ? t('export.no_ot', 'No Overtime Days')
              : `${t('export.export_btn', 'Export Excel Ledger')} (${overtimeCount})`}
          </span>
        </button>
      </div>
    </div>
  );
};
