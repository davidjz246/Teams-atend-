import React from 'react';
import { fmtHours, DAY_NAMES, formatWeekendNames } from '../utils/parser';
import { Calendar, ShieldCheck, Check, RotateCcw, Info } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SummaryCardProps {
  totalDays: number;
  counts: {
    present: number;
    absent: number;
    overtime: number;
    missing: number;
    late: number;
    excused: number;
  };
  totalOvertimeMins: number;
  breakdown: {
    absent: number;
    weekend: number;
    holiday: number;
    leave: number;
    excused: number;
    overtime_manual: number;
    wfh: number;
  };
  weekendDays: number[];
  onToggleWeekendDay: (dayIndex: number) => void;
  onSetWeekendDays: (days: number[]) => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  totalDays,
  counts,
  totalOvertimeMins,
  breakdown,
  weekendDays,
  onToggleWeekendDay,
  onSetWeekendDays,
}) => {
  const { t } = useLanguage();

  const hasBreakdown =
    breakdown.absent +
      breakdown.weekend +
      breakdown.holiday +
      breakdown.leave +
      breakdown.excused +
      breakdown.overtime_manual +
      breakdown.wfh >
    0;

  const weekendNamesLabel = formatWeekendNames(weekendDays);

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 mb-6 shadow-sm">
      {/* Title & Processed Days */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border/80">
        <div>
          <p className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('summary.title')}</span>
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
            {t('summary.breakdown_title')} <span className="text-amber-500 font-mono">{totalDays}</span> {t('summary.days_processed')}
          </h2>
        </div>
      </div>

      {/* FIELD UNDER LEDGER OVERVIEW: CUSTOM WEEKEND DAYS SELECTOR & NAME DISPLAY */}
      <div className="mb-6 p-4 rounded-2xl bg-muted/20 border border-border flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              {t('summary.weekend_config')}
            </span>
          </div>

          {/* ACTIVE WEEKEND NAMES DISPLAY BESIDE THE CONTROLS */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold shadow-2xs self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{t('summary.active_weekend')} {weekendNamesLabel}</span>
          </div>
        </div>

        {/* DAY OF THE WEEK SELECTOR PILLS */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {DAY_NAMES.map((d) => {
              const isSelected = weekendDays.includes(d.index);
              return (
                <button
                  key={d.index}
                  type="button"
                  onClick={() => onToggleWeekendDay(d.index)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                  }`}
                  title={`Click to toggle ${d.long} as an official weekend rest day`}
                >
                  {isSelected && <Check className="w-3 h-3 text-black" />}
                  <span>{d.short}</span>
                </button>
              );
            })}
          </div>

          {/* QUICK PRESETS */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-muted-foreground">
            <span className="opacity-75">{t('summary.presets')}</span>
            <button
              type="button"
              onClick={() => onSetWeekendDays([5, 6])}
              className="px-2.5 py-1 rounded-xl bg-card hover:bg-muted border border-border text-foreground hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t('summary.fri_sat')}
            </button>
            <button
              type="button"
              onClick={() => onSetWeekendDays([0, 6])}
              className="px-2.5 py-1 rounded-xl bg-card hover:bg-muted border border-border text-foreground hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t('summary.sat_sun')}
            </button>
            <button
              type="button"
              onClick={() => onSetWeekendDays([0, 5, 6])}
              className="px-2.5 py-1 rounded-xl bg-card hover:bg-muted border border-border text-foreground hover:text-amber-400 transition-colors cursor-pointer"
            >
              {t('summary.fri_sat_sun')}
            </button>
          </div>
        </div>
      </div>

      {/* METRICS SUMMARY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {counts.present}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.on_time')}
          </div>
        </div>

        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {counts.overtime}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.ot_days')}
          </div>
        </div>

        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-3xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight">
            {counts.excused}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.excused_days')}
          </div>
        </div>

        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {counts.absent}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.unexcused_off')}
          </div>
        </div>

        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {counts.overtime > 0 ? fmtHours(totalOvertimeMins) : '—'}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.total_ot')}
          </div>
        </div>

        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 text-center flex flex-col justify-between">
          <div className="font-mono text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {counts.late}
          </div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mt-2">
            {t('summary.late_arrivals')}
          </div>
        </div>
      </div>

      {hasBreakdown && (
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/80">
          {breakdown.wfh > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-semibold flex items-center gap-1.5 border border-cyan-300 dark:border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 inline-block"></span>
              {breakdown.wfh} {t('summary.wfh')}
            </span>
          )}
          {breakdown.excused > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 font-semibold flex items-center gap-1.5 border border-teal-300 dark:border-teal-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 inline-block"></span>
              {breakdown.excused} {t('summary.with_excuse')}
            </span>
          )}
          {breakdown.overtime_manual > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 border border-amber-300 dark:border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              {breakdown.overtime_manual} {t('summary.manual_ot')}
            </span>
          )}
          {breakdown.absent > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-1.5 border border-rose-300 dark:border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
              {breakdown.absent} {t('summary.unexcused')}
            </span>
          )}
          {breakdown.weekend > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-zinc-200/70 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-300 font-semibold flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400 inline-block"></span>
              {breakdown.weekend} {t('summary.weekend_rest')}
            </span>
          )}
          {breakdown.holiday > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 font-semibold flex items-center gap-1.5 border border-teal-300 dark:border-teal-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block"></span>
              {breakdown.holiday} {t('summary.holiday')}
            </span>
          )}
          {breakdown.leave > 0 && (
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 font-semibold flex items-center gap-1.5 border border-indigo-300 dark:border-indigo-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
              {breakdown.leave} {t('summary.leave')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
