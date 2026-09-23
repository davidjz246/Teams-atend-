import React from 'react';
import {
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Award,
  Check,
} from 'lucide-react';
import { fmtHours } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface EmployeeReportHeroProps {
  employeeName: string;
  employeeId: string;
  totalDays: number;
  punctualityScore: number;
  totalOvertimeMins: number;
  overtimeCount: number;
  lateCount: number;
  presentCount: number;
  excusedCount: number;
  isUserDataComplete: boolean;
  missingDataErrors: Array<{ id: string; label: string; actionLabel?: string; action?: () => void }>;
  shiftEndTime: string;
  lateThresholdVal: string;
  completionPercentage: number;
  completedRequiredCount: number;
  totalRequiredCount: number;
  assignedTeamName?: string;
  assignedTeamLeaderName?: string;
  assignedTeamLeaderSapId?: string;
  onOpenDirectory: () => void;
  onOpenStickyNotes?: () => void;
  onNavigateTab?: (tab: 'team_leader_approvals' | 'manager_overview' | 'employee_ledger') => void;
}

export const EmployeeReportHero: React.FC<EmployeeReportHeroProps> = ({
  employeeName,
  employeeId,
  totalDays,
  punctualityScore,
  totalOvertimeMins,
  overtimeCount,
  lateCount,
  presentCount,
  excusedCount,
  missingDataErrors,
  shiftEndTime,
  lateThresholdVal,
  completionPercentage,
  completedRequiredCount,
  totalRequiredCount,
  assignedTeamName,
  assignedTeamLeaderName,
  assignedTeamLeaderSapId,
  onOpenDirectory,
  onNavigateTab,
}) => {
  const { t } = useLanguage();
  const cleanName = employeeName.trim();
  const cleanId = employeeId.trim();

  // Extract initials (e.g. John Doe -> JD)
  const initials = cleanName
    ? cleanName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'WD';

  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 mb-6 transition-all duration-300 shadow-md border ${
        completionPercentage === 100
          ? 'bg-card border-emerald-500/30'
          : completionPercentage >= 60
          ? 'bg-card border-amber-500/30'
          : 'bg-card border-rose-500/30'
      }`}
    >
      {/* Top Action & Verification Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-border/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs transition-all duration-300 ${
              completionPercentage === 100
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : completionPercentage >= 60
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {completionPercentage === 100 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('hero.verified_100')}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('hero.incomplete').replace('{pct}', String(completionPercentage))}</span>
              </>
            )}
          </span>

          <span className="font-mono text-xs font-medium px-3 py-1.5 rounded-xl bg-muted/40 border border-border/80 text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('hero.shift_end')} {shiftEndTime || '17:00'}</span>
          </span>
        </div>

        <button
          onClick={onOpenDirectory}
          className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all hover:bg-muted text-foreground border-border shadow-2xs flex items-center gap-1.5 cursor-pointer"
          title="Open Employee Staff Directory"
        >
          <Users className="w-3.5 h-3.5 text-amber-500" />
          <span>{cleanId ? `${t('hero.staff_id')}${cleanId}` : t('hero.select_dir')}</span>
        </button>
      </div>

      {/* CENTERED EMPLOYEE IDENTITY HEADER WITH LIVE DATA COMPLETION COUNTER */}
      <div className="text-center max-w-2xl mx-auto space-y-3 py-1">
        {/* Avatar Circle */}
        <div className="relative inline-block mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-black font-mono font-black text-xl mx-auto flex items-center justify-center shadow-md shadow-amber-500/20">
            {initials}
          </div>
          {completionPercentage === 100 ? (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-md border-2 border-card">
              <Check className="w-3 h-3" />
            </span>
          ) : (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-mono font-black shadow-md border-2 border-card">
              !
            </span>
          )}
        </div>

        {/* Employee Name + DYNAMIC COMPLETION COUNTER */}
        <div className="flex items-center justify-center gap-2.5 flex-wrap px-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {cleanName || <span className="text-muted-foreground font-normal italic">{t('export.name_placeholder')}</span>}
          </h1>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all duration-300 ${
              completionPercentage === 100
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : completionPercentage >= 60
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {completionPercentage === 100 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-extrabold">{completionPercentage}%</span>
                <span className="text-[10px] uppercase font-semibold">{t('hero.ready')}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-extrabold">{completionPercentage}%</span>
                <span className="text-[10px] uppercase font-semibold">{t('hero.filled')}</span>
              </>
            )}
          </div>
        </div>

        {/* Subtitle Details */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-mono text-muted-foreground">
          <span className="px-2.5 py-0.5 rounded-lg bg-muted text-foreground font-semibold border border-border">
            SAP #{cleanId || 'Pending'}
          </span>
          {assignedTeamLeaderName && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold" title="Assigned Team Leader who reviews and approves overtime">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('export.approver')} {assignedTeamLeaderName}</span>
                {assignedTeamLeaderSapId && <span className="opacity-80 font-normal">(SAP #{assignedTeamLeaderSapId})</span>}
              </span>
            </>
          )}
          {assignedTeamName && (
            <>
              <span>•</span>
              <span className="text-foreground font-medium">{assignedTeamName}</span>
            </>
          )}
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>{totalDays} {t('hero.days_in_ledger')}</span>
          </span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">
            {punctualityScore}% {t('hero.on_time')}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="max-w-xs mx-auto pt-1">
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border/60">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completionPercentage === 100
                  ? 'bg-emerald-500'
                  : completionPercentage >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* STRUCTURED AUDIT TILES */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            <span>{t('hero.audit_status')}</span>
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            {completedRequiredCount}/{totalRequiredCount} ({completionPercentage}%)
          </span>
        </div>

        {/* 4 Dedicated Structured Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tile 1: Employee Record & Approver */}
          <div className="bg-muted/20 border border-border rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('hero.tile_emp')}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${cleanName && cleanId ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground font-mono truncate">
                {cleanName ? cleanName : cleanId ? `ID #${cleanId}` : t('export.err_sap')}
              </div>
              <p className="text-[11px] text-amber-400 font-mono font-medium mt-0.5 truncate">
                {assignedTeamLeaderName ? `TL: ${assignedTeamLeaderName}` : t('role.team_leader')}
              </p>
            </div>
          </div>

          {/* Tile 2: Overtime Justifications */}
          <div className="bg-muted/20 border border-border rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('hero.tile_ot_reasons')}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${missingDataErrors.some((e) => e.id.includes('reason')) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground font-mono">
                {overtimeCount > 0
                  ? `${overtimeCount} ${t('hero.ot_days')} (${fmtHours(totalOvertimeMins)})`
                  : `0 ${t('hero.ot_days')}`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {missingDataErrors.some((e) => e.id.includes('reason'))
                  ? t('hero.reasons_req')
                  : t('hero.all_reasons_doc')}
              </p>
            </div>
          </div>

          {/* Tile 3: Punctuality Status */}
          <div className="bg-muted/20 border border-border rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('hero.tile_punctuality')}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${lateCount === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
                <span>{punctualityScore}% {t('hero.on_time')}</span>
                {lateCount === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                    {t('hero.zero_late')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {lateCount === 0
                  ? `${t('hero.checkins_before')} ${lateThresholdVal || '09:15'}`
                  : `${lateCount} ${t('hero.late_arrivals_count')}`}
              </p>
            </div>
          </div>

          {/* Tile 4: Export Readiness */}
          <div className="bg-muted/20 border border-border rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('hero.tile_export')}</span>
              </span>
              <span className={`w-2 h-2 rounded-full ${completionPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
            <div>
              <div className="text-sm font-bold text-foreground font-mono">
                {completionPercentage === 100 ? '100% Ready' : `${completionPercentage}% Complete`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {completionPercentage === 100
                  ? t('hero.ready_for_excel')
                  : `${completedRequiredCount}/${totalRequiredCount}`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Required Alert Box (if incomplete) */}
        {completionPercentage < 100 && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {t('hero.required_missing').replace('{done}', String(completedRequiredCount)).replace('{total}', String(totalRequiredCount))}
              </span>
            </div>
            <ul className="space-y-1 pl-1">
              {missingDataErrors.map((err) => (
                <li key={err.id} className="flex items-center justify-between text-[11px] text-foreground gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                    {err.label}
                  </span>
                  {err.action && (
                    <button
                      onClick={err.action}
                      className="px-2 py-0.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 shrink-0 text-[10px] cursor-pointer shadow-2xs"
                    >
                      {err.actionLabel}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* BOTTOM KEY METRICS SUMMARY RIBBON */}
      <div className="mt-5 pt-4 border-t border-border/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center font-mono">
        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className="text-xl font-black text-foreground">{punctualityScore}%</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.punctuality')}</div>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className="text-xl font-black text-amber-500">{fmtHours(totalOvertimeMins)}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.overtime')}</div>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className="text-xl font-black text-emerald-400">{presentCount}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.on_time_days')}</div>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className="text-xl font-black text-amber-500">{overtimeCount}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.ot_days')}</div>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className="text-xl font-black text-teal-400">{excusedCount}</div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.excused')}</div>
        </div>

        <div className="bg-muted/20 border border-border/60 rounded-2xl p-2.5">
          <div className={`text-xl font-black ${lateCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {lateCount}
          </div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{t('hero.late_days')}</div>
        </div>
      </div>
    </div>
  );
};
