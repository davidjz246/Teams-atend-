import React from 'react';
import { DayCategory, DayClassification, PermissionStatus, RuleSettings, OvertimeSubmission } from '../types';
import { fmtHours, to12Hour, toMinutes, toHM, weekdayOf } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Calendar,
  StickyNote,
  AlertTriangle,
  CheckSquare,
  Square,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface DayTableProps {
  classifiedList: DayClassification[];
  overrides: Record<string, DayCategory>;
  onUpdateOverride: (date: string, category: DayCategory) => void;
  rules: RuleSettings;
  permissionsFiled: Record<string, PermissionStatus>;
  onTogglePermission: (date: string) => void;
  dayReasons: Record<string, string>;
  onUpdateReason: (date: string, reason: string) => void;
  weekendDays?: number[];
  absenceCheckpoints?: Record<string, boolean>;
  onToggleAbsenceCheckpoint?: (date: string) => void;
  activeSubmission?: OvertimeSubmission;
}

export const DayTable: React.FC<DayTableProps> = ({
  classifiedList,
  overrides,
  onUpdateOverride,
  rules,
  permissionsFiled,
  onTogglePermission,
  dayReasons,
  onUpdateReason,
  weekendDays = [5, 6],
  absenceCheckpoints = {},
  onToggleAbsenceCheckpoint,
  activeSubmission,
}) => {
  const { t, language } = useLanguage();
  const dayMinutes = 24 * 60;

  return (
    <div className="bg-card border border-border rounded-3xl p-7 sm:p-8 lg:p-9 shadow-sm overflow-hidden" id="day-table-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-border/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
              {t('table.title', 'Day-by-Day Ledger Table & Reason Manager')}
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Review daily punches, apply category overrides, and add required overtime reasons
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {classifiedList.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4 border border-border shadow-2xs">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground font-mono">
              {t('table.no_data', 'No Attendance Data Loaded')}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
              {t('table.no_data_desc', 'Paste attendance punch logs into the input area above and click "Read the ledger" to calculate worked hours, overtime, and attendance status.')}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[920px]">
          <thead>
            <tr className="border-b border-border/80">
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold">
                {t('table.col_date', 'Date')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold">
                {t('table.col_day', 'Day')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold">
                {t('table.col_in_out', 'In / Out')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 w-[140px] font-bold">
                {t('table.col_shape', 'Day shape')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold">
                {t('table.col_worked', 'Worked')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold">
                {t('table.col_status', 'Status & Alerts')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 font-bold w-[280px]">
                {t('table.col_reason', 'Reason / Excuse Checkpoint')}
              </th>
              <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3.5 px-4 text-right font-bold">
                {t('table.col_category', 'Category')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {classifiedList.map((c) => {
              const r = c.row;
              const { label: dayLabel, isWeekend } = weekdayOf(r.date, weekendDays);
              const isThu = dayLabel.toLowerCase() === 'thu';
              const isEarlyThu = (rules.thursdayEarlyShift ?? true);
              const isAbsent = c.status === 'absent';
              const isWeekendRow = isWeekend;
              const hasOverride = overrides[r.date] !== undefined;
              const currentCat: DayCategory = hasOverride
                ? overrides[r.date]
                : isWeekendRow
                ? 'weekend'
                : isAbsent
                ? 'absent'
                : c.status === 'overtime'
                ? 'overtime_manual'
                : 'present';

              const isPermissionFiled = permissionsFiled[r.date] === 'filed';
              const isOvertime = currentCat === 'overtime_manual';
              const isExcused = currentCat === 'excused';
              const isWFH = currentCat === 'wfh';
              const isLeave = currentCat === 'leave';
              const isHoliday = currentCat === 'holiday';
              const isWeekendCat = currentCat === 'weekend';
              const isAbsentCat = currentCat === 'absent';
              const isPresentCat = currentCat === 'present';

              const showLateAlert =
                c.isLate && !['weekend', 'holiday', 'leave', 'absent', 'wfh'].includes(currentCat);

              const reasonValue = dayReasons[r.date] || '';
              const isMissingReason = isOvertime && !reasonValue.trim();

              const isAbsenceRow = (r.start === '00:00:00' && r.end === '00:00:00' && !isWeekendRow && currentCat !== 'wfh' && currentCat !== 'holiday') || isAbsentCat || isLeave;

              const isAbsenceCheckpointChecked =
                currentCat === 'leave' ||
                currentCat === 'excused' ||
                absenceCheckpoints[r.date] === true ||
                reasonValue.trim().length > 0;
              const isUnresolvedAbsent = isAbsentCat && !isAbsenceCheckpointChecked;

              // Day shape bar calculations
              let bar = <div className="w-[120px] h-2 bg-muted/60 rounded-full border border-border/60" />;
              if (!isAbsentCat && !isWeekendCat && !isHoliday && !isLeave && c.startMin !== null) {
                const leftPct = (c.startMin / dayMinutes) * 100;
                const endForBar = c.status === 'missing' ? c.startMin + 30 : c.endMin ?? c.startMin + 30;
                const widthPct = Math.max(1.5, ((endForBar - c.startMin) / dayMinutes) * 100);

                let fillClass = 'bg-emerald-500';
                if (isOvertime) fillClass = 'bg-amber-500';
                if (isWFH) fillClass = 'bg-cyan-500';
                if (isExcused) fillClass = 'bg-teal-500';
                if (c.status === 'missing') fillClass = 'bg-slate-400';

                let marker = null;
                if (rules.timeOn) {
                  const otCutoff = (isThu && isEarlyThu) ? (rules.thursdayOvertimeStart || '16:50') : (rules.timeVal || '17:50');
                  const mLeft = (toMinutes(otCutoff + ':00') / dayMinutes) * 100;
                  marker = (
                    <div
                      className="absolute top-0 bottom-0 w-[1.5px] bg-foreground/50 z-10"
                      style={{ left: `${mLeft}%` }}
                      title={`Overtime cutoff: ${otCutoff}`}
                    />
                  );
                }

                bar = (
                  <div className="relative w-[120px] h-2 bg-background rounded-full border border-border/80 overflow-hidden">
                    {marker}
                    <div
                      className={`absolute top-0 bottom-0 rounded-full ${fillClass}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  </div>
                );
              }

              const workedText =
                isOvertime && c.workedMin === 0
                  ? '+1h OT'
                  : isWFH && c.workedMin === 0
                  ? '8h WFH'
                  : isExcused && c.workedMin === 0
                  ? t('cat.excused', 'Excused')
                  : isLeave
                  ? t('cat.leave', 'Leave')
                  : isHoliday
                  ? t('cat.holiday', 'Holiday')
                  : isWeekendCat
                  ? t('cat.weekend', 'Weekend')
                  : isAbsentCat
                  ? '—'
                  : c.workedMin > 0
                  ? fmtHours(c.workedMin)
                  : '—';

              return (
                <tr
                  key={r.date}
                  className={`transition-colors ${
                    isMissingReason || isUnresolvedAbsent
                      ? 'bg-rose-500/10 hover:bg-rose-500/15'
                      : showLateAlert
                      ? 'bg-rose-500/5 hover:bg-rose-500/10'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Date */}
                  <td className="py-4 px-4 font-mono text-xs sm:text-sm font-bold whitespace-nowrap text-foreground">
                    {r.date}
                  </td>

                  {/* Day */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-xs uppercase tracking-wider font-semibold ${
                          isWeekendCat ? 'text-zinc-500' : 'text-muted-foreground'
                        }`}
                      >
                        {dayLabel}
                      </span>
                      {dayLabel.toLowerCase() === 'thu' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20" title="Thursday standard shift ends at 4:00 PM (16:00)">
                          4 PM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Check-In / Check-Out */}
                  <td className="py-4 px-4 font-mono text-xs whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={
                          showLateAlert
                            ? 'text-rose-500 font-bold underline decoration-rose-500/50'
                            : 'text-foreground font-medium'
                        }
                      >
                        {r.start === '00:00:00' ? '—' : r.start}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {r.end === '00:00:00' ? '—' : r.end}
                      </span>
                    </div>
                  </td>

                  {/* Day Shape Visualizer */}
                  <td className="py-4 px-4">{bar}</td>

                  {/* Hours Worked */}
                  <td className="py-4 px-4 font-mono text-xs sm:text-sm whitespace-nowrap font-bold text-foreground">
                    {workedText}
                  </td>

                  {/* Status & Alerts */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Dynamic Status Pill */}
                        {isWFH ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                            {t('cat.wfh', 'Work From Home')}
                          </span>
                        ) : isExcused ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400"></span>
                            {t('cat.excused', 'Day with Excuse')}
                          </span>
                        ) : isOvertime ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {c.overtimeMin > 0 ? `${fmtHours(c.overtimeMin)} ${t('table.ot_badge', 'overtime')}` : t('cat.overtime_manual', 'Overtime Day')}
                            </span>
                            {(() => {
                              const subItem = activeSubmission?.items?.find((i) => i.date === r.date);
                              if (!subItem) return null;
                              if (subItem.status === 'approved') {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    title={`Team Leader Note: ${subItem.adjustedReason || subItem.leaderNotes || 'Verified & Authorized'}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>{t('sub.approved_by', 'TL Approved')} ({toHM(subItem.overtimeMinutes)})</span>
                                  </span>
                                );
                              }
                              if (subItem.status === 'rejected') {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    title={`Team Leader Reason: ${subItem.adjustedReason || subItem.leaderNotes || 'Declined by Team Leader'}`}
                                  >
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    <span>{t('tl.status_rejected', 'TL Denied')}</span>
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  title="Submitted to Team Leader — Pending Review"
                                >
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>{t('tl.pending', 'TL Review Pending')}</span>
                                </span>
                              );
                            })()}
                          </>
                        ) : isLeave ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
                            {t('cat.leave', 'Leave Permission')}
                          </span>
                        ) : isHoliday ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400"></span>
                            {t('cat.holiday', 'Holiday')}
                          </span>
                        ) : isWeekendCat ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400"></span>
                            {t('cat.weekend', 'Weekend')}
                          </span>
                        ) : isAbsentCat ? (
                          isAbsenceCheckpointChecked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              {t('hero.verified_100', 'Absence Checkpoint Verified')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                              {t('cat.absent', 'Unexcused Absence (Checkpoint Needed)')}
                            </span>
                          )
                        ) : isPresentCat ? (
                          c.status === 'missing' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400"></span>
                              {t('summary.unexcused', 'Missing Checkout')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {t('hero.on_time', 'On time')}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-muted text-foreground border border-border">
                            {currentCat}
                          </span>
                        )}

                        {/* Late Pill */}
                        {showLateAlert && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-bold uppercase bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            {t('table.late_badge', 'Late')} ({fmtHours(c.lateMin)})
                          </span>
                        )}
                      </div>

                      {/* Late Arrival Reminder */}
                      {showLateAlert && (
                        <div className="mt-1 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs flex items-center justify-between gap-2">
                          <span className="text-rose-700 dark:text-rose-400 font-semibold text-[11px]">
                            {t('late.in_at', 'In at {time}').replace('{time}', to12Hour(r.start)).replace('{mins}', String(c.lateMin))}
                          </span>
                          <button
                            onClick={() => onTogglePermission(r.date)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                              isPermissionFiled
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                                : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                          >
                            {isPermissionFiled ? t('late.filed', 'Permission Filed') : t('late.mark_filed', 'File Permission')}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Reason & Absence Excuse Checkpoint Column */}
                  <td className="py-4 px-4">
                    {isOvertime ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={reasonValue}
                          onChange={(e) => onUpdateReason(r.date, e.target.value)}
                          placeholder={t('table.reason_placeholder', 'Mandatory Overtime reason...')}
                          className={`w-full bg-background rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-hidden transition-all ${
                            isMissingReason
                              ? 'border-2 border-rose-500 placeholder:text-rose-500/70 shadow-xs'
                              : 'border border-amber-500/60 focus:border-amber-500'
                          }`}
                        />
                        {isMissingReason && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-semibold block mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" /> {t('export.err_reasons', 'Reason required for Excel export')}
                          </span>
                        )}
                      </div>
                    ) : isAbsenceRow ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onToggleAbsenceCheckpoint && onToggleAbsenceCheckpoint(r.date)}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                              isAbsenceCheckpointChecked
                                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20'
                                : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                            }`}
                            title="Click to check: Automatically sets category to Leave Permission"
                          >
                            {isAbsenceCheckpointChecked ? (
                              <CheckSquare className="w-4 h-4 text-indigo-500" />
                            ) : (
                              <Square className="w-4 h-4 text-rose-500" />
                            )}
                            <span>
                              {isAbsenceCheckpointChecked
                                ? '✓ ' + t('cat.leave', 'Leave Permission Checked')
                                : t('cat.leave', 'Check Point (Leave Permission)')}
                            </span>
                          </button>

                          {currentCat !== 'excused' && (
                            <button
                              type="button"
                              onClick={() => onUpdateOverride(r.date, 'excused')}
                              className="px-2.5 py-1 rounded-xl font-mono text-[10px] bg-muted hover:bg-teal-500/20 text-muted-foreground hover:text-teal-400 border border-border transition-colors cursor-pointer"
                              title="Set category to Day with Excuse"
                            >
                              {t('table.mark_excused', 'Mark Excused')}
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={reasonValue}
                          onChange={(e) => onUpdateReason(r.date, e.target.value)}
                          placeholder={t('table.excuse_placeholder', 'Optional absence excuse (e.g. Approved leave, Doctor)...')}
                          className="w-full bg-background border border-border hover:border-indigo-500/40 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-hidden"
                        />
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-muted-foreground/60 italic px-2">
                        {reasonValue ? reasonValue : '—'}
                      </div>
                    )}
                  </td>

                  {/* Category Dropdown */}
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <select
                      value={currentCat}
                      onChange={(e) => onUpdateOverride(r.date, e.target.value as DayCategory)}
                      className={`text-xs font-mono font-bold uppercase px-3.5 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-hidden transition-colors ${
                        currentCat === 'absent'
                          ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                          : currentCat === 'wfh'
                          ? 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30'
                          : currentCat === 'excused'
                          ? 'bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                          : currentCat === 'overtime_manual'
                          ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                          : currentCat === 'weekend'
                          ? 'bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700/50'
                          : currentCat === 'holiday'
                          ? 'bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30'
                          : currentCat === 'leave'
                          ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30'
                          : 'bg-card text-foreground border-border'
                      }`}
                    >
                      <option value="present" className="bg-card text-foreground">{t('cat.present', 'Normal / On time')}</option>
                      <option value="wfh" className="bg-card text-foreground">{t('cat.wfh', 'Work From Home (WFH)')}</option>
                      <option value="excused" className="bg-card text-foreground">{t('cat.excused', 'Day with Excuse')}</option>
                      <option value="overtime_manual" className="bg-card text-foreground">{t('cat.overtime_manual', 'Overtime Day')}</option>
                      <option value="absent" className="bg-card text-foreground">{t('cat.absent', 'Unexcused Absence')}</option>
                      <option value="leave" className="bg-card text-foreground">{t('cat.leave', 'Leave permission')}</option>
                      <option value="holiday" className="bg-card text-foreground">{t('cat.holiday', 'Official Holiday')}</option>
                      <option value="weekend" className="bg-card text-foreground">{t('cat.weekend', 'Weekend / Rest day')}</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};
