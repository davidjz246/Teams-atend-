import React from 'react';
import { ExportSettings, UserProfile } from '../types';
import {
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Check,
  BarChart3,
  Lock,
  Download,
  Sparkles,
  ArrowRight,
  User,
  Hash,
  Clock,
  CalendarCheck,
} from 'lucide-react';
import { normalizeEmployeeId } from '../utils/employeeDirectory';
import { getTeamForSapId } from '../utils/teamDatabase';
import { useLanguage } from '../i18n/LanguageContext';

interface VerificationExportCardProps {
  exportSettings: ExportSettings;
  overtimeCount: number;
  missingReasonsCount: number;
  unresolvedAbsencesCount?: number;
  hasPunchData?: boolean;
  totalPunchesCount?: number;
  missingReasonsList?: string[];
  unresolvedAbsentList?: string[];
  onOpenStickyNotes: () => void;
  onNavigateSection: (sectionId: 'section1' | 'section2' | 'section3', targetElementId?: string) => void;
  onExport: () => void;
  onSubmitToTeamLeader?: () => void;
  currentUser?: UserProfile;
}

export const VerificationExportCard: React.FC<VerificationExportCardProps> = ({
  exportSettings,
  overtimeCount,
  missingReasonsCount,
  unresolvedAbsencesCount = 0,
  hasPunchData = false,
  totalPunchesCount = 0,
  missingReasonsList = [],
  unresolvedAbsentList = [],
  onOpenStickyNotes,
  onNavigateSection,
  onExport,
  onSubmitToTeamLeader,
  currentUser,
}) => {
  const { t } = useLanguage();

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

  // 5 Mandatory Criteria for 100% Export Readiness
  const criteriaList = [
    {
      id: 'sap',
      title: t('export.sap_label', 'Numeric SAP #'),
      section: 'section1' as const,
      targetElementId: 'sap-input-field',
      isValid: isSapValid,
      missingMessage: 'Enter valid numeric SAP ID in Section 1',
      actionLabel: 'Enter SAP in Section 1',
    },
    {
      id: 'name',
      title: t('export.name_label', 'Employee Full Name'),
      section: 'section1' as const,
      targetElementId: 'name-input-field',
      isValid: isNameValid,
      missingMessage: 'Enter full employee name in Section 1',
      actionLabel: 'Enter Name in Section 1',
    },
    {
      id: 'punches',
      title: t('export.sec2_punches', 'Attendance Punches'),
      section: 'section1' as const,
      targetElementId: 'raw-punch-input-section',
      isValid: isPunchDataValid,
      missingMessage: 'Paste raw punch logs in Section 1 & click "Read the ledger"',
      actionLabel: 'Paste Punches in Section 1',
    },
    {
      id: 'reasons',
      title: t('export.sec3_ot', 'Overtime Reasons'),
      section: 'section2' as const,
      targetElementId: 'day-table-section',
      isValid: isOvertimeReasonsValid,
      missingMessage: `${missingReasonsCount} overtime day(s) missing mandatory justification in Section 2`,
      actionLabel: 'Fill Reasons in Section 2',
      secondaryAction: {
        label: t('export.fill_sticky', 'Fill with Sticky Notes'),
        onClick: onOpenStickyNotes,
      },
    },
    {
      id: 'absences',
      title: t('export.sec4_absent', 'Absence Checkpoints'),
      section: 'section2' as const,
      targetElementId: 'day-table-section',
      isValid: isAbsencesValid,
      missingMessage: `${unresolvedAbsencesCount} unexcused absence day(s) need excuse or checkpoint verification in Section 2`,
      actionLabel: 'Review Absences in Section 2',
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
    <div className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-lg flex flex-col justify-between gap-7" id="verification-export-section">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
                {t('section.sec3_tab', 'Section 3: Verification & Export Hub')}
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {t('section.missing_click_hint', 'Click any missing item below to jump directly to its section and fix it')}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold shadow-2xs">
            <span>{assignedApproverRole}: {assignedApproverName} (SAP #{assignedApproverSap})</span>
          </div>
        </div>

        {/* 1. THE COMPLETE PROGRESS BAR (0% TO 100%) */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all mb-6 ${
            isReady100
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
              : 'bg-muted/30 border-border/90'
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              {isReady100 ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
              )}
              <span className="font-mono text-sm font-bold text-foreground">
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

          {/* Visual Bar */}
          <div className="w-full bg-muted/70 rounded-full h-4 p-0.5 overflow-hidden border border-border/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isReady100
                  ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.6)]'
                  : progressPercent >= 60
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>

          {isReady100 && (
            <div className="mt-4 pt-3 border-t border-emerald-500/20 text-xs font-mono text-emerald-400 font-medium flex items-center gap-2">
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

        {/* 2. 4-SECTION VERIFICATION CHECKLIST CARDS */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
              {t('export.readiness_title', 'Mandatory Verification Checklist')}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {completedCount} / {totalCount} Requirements Met
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Identity */}
            <button
              type="button"
              onClick={() => onNavigateSection('section1', !isSapValid ? 'sap-input-field' : 'name-input-field')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
                isSapValid && isNameValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold flex items-center gap-1.5 truncate">
                    {isSapValid && isNameValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>1. Identity</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80 flex items-center gap-0.5">
                    Sec 1 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {isSapValid && isNameValid
                    ? `${exportSettings.name} (#${exportSettings.employeeId})`
                    : 'SAP & Name Required'}
                </p>
              </div>
            </button>

            {/* Card 2: Punches */}
            <button
              type="button"
              onClick={() => onNavigateSection('section1', 'raw-punch-input-section')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
                isPunchDataValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold flex items-center gap-1.5 truncate">
                    {isPunchDataValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>2. Attendance Logs</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80 flex items-center gap-0.5">
                    Sec 1 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {isPunchDataValid ? `${totalPunchesCount} punch days parsed` : 'Punch input needed'}
                </p>
              </div>
            </button>

            {/* Card 3: Overtime Reasons */}
            <button
              type="button"
              onClick={() => onNavigateSection('section2', 'day-table-section')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
                isOvertimeReasonsValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold flex items-center gap-1.5 truncate">
                    {isOvertimeReasonsValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>3. Overtime Reasons</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80 flex items-center gap-0.5">
                    Sec 2 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {isOvertimeReasonsValid
                    ? `${overtimeCount} reasons justified`
                    : `${missingReasonsCount} reason(s) pending`}
                </p>
              </div>
            </button>

            {/* Card 4: Absence Checkpoints */}
            <button
              type="button"
              onClick={() => onNavigateSection('section2', 'day-table-section')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
                isAbsencesValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold flex items-center gap-1.5 truncate">
                    {isAbsencesValid ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>4. Absence Checkpoints</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80 flex items-center gap-0.5">
                    Sec 2 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {isAbsencesValid ? 'All absences verified' : `${unresolvedAbsencesCount} checkpoint(s) needed`}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 3. INTERACTIVE "WHAT IS MISSING" LIST WITH CLICK-TO-JUMP NAVIGATION */}
        {!isReady100 && (
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
              <div className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t('export.missing_banner').replace('{count}', String(missingItems.length))}</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {t('section.missing_click_hint', 'Click any button below to jump directly to that section')}
              </span>
            </div>

            <div className="space-y-2.5">
              {missingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-border/80 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-amber-500/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-mono text-xs font-bold text-foreground shrink-0">{item.title}:</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{item.missingMessage}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {item.secondaryAction && (
                      <button
                        type="button"
                        onClick={item.secondaryAction.onClick}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        {item.secondaryAction.label}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigateSection(item.section, item.targetElementId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-muted hover:bg-amber-500 hover:text-black text-foreground border border-border transition-all cursor-pointer active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. GATED ACTION BUTTONS: EXCEL WILL NOT BE AVAILABLE UNTIL 100% READY */}
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
                ? `${t('export.complete_missing', 'Complete Missing Items')} (${progressPercent}%)`
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
              onNavigateSection('section1', 'sap-input-field');
              return;
            }
            if (!isNameValid) {
              alert(t('val.cannot_export_name', 'Employee Full Name is required.'));
              onNavigateSection('section1', 'name-input-field');
              return;
            }
            if (!isPunchDataValid) {
              alert(t('val.missing_data_logs', 'Please paste attendance punch logs first.'));
              onNavigateSection('section1', 'raw-punch-input-section');
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
              ? `${t('export.complete_missing', 'Complete Missing Items')} (${progressPercent}%)`
              : overtimeCount === 0
              ? t('export.no_ot', 'No Overtime Days')
              : `${t('export.export_btn', 'Export Excel Ledger')} (${overtimeCount})`}
          </span>
        </button>
      </div>
    </div>
  );
};
