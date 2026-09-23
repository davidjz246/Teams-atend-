import React from 'react';
import { RuleSettings } from '../types';
import { Clock, ShieldAlert, Award, Sliders, CalendarDays, Timer } from 'lucide-react';
import { DAY_NAMES, formatWeekendNames } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface RulesCardProps {
  rules: RuleSettings;
  onChangeRules: (rules: RuleSettings) => void;
}

export const RulesCard: React.FC<RulesCardProps> = ({ rules, onChangeRules }) => {
  const { t } = useLanguage();

  const updateRule = <K extends keyof RuleSettings>(key: K, value: RuleSettings[K]) => {
    onChangeRules({
      ...rules,
      [key]: value,
    });
  };

  const toggleWeekendDay = (dayIndex: number) => {
    const current = rules.weekendDays || [0, 5, 6];
    let updated: number[];
    if (current.includes(dayIndex)) {
      updated = current.filter((d) => d !== dayIndex);
    } else {
      updated = [...current, dayIndex];
    }
    updateRule('weekendDays', updated);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-7 sm:p-8 lg:p-9 shadow-sm flex flex-col justify-between" id="rules-card-section">
      <div>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
                {t('rules.title')}
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Automated overtime triggers, shift end thresholds &amp; schedule rules
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {/* Rule 1: Checkout Time */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              rules.timeOn ? 'bg-muted/25 border-border shadow-2xs' : 'bg-muted/10 border-border/40 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3.5">
              <label className="text-xs font-bold font-mono text-foreground flex items-center gap-1.5 cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('rules.shift_end_std')}</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.timeOn}
                  onChange={(e) => updateRule('timeOn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="font-mono text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span>{t('rules.cutoff_time')}</span>
              <input
                type="time"
                value={rules.timeVal || '17:50'}
                disabled={!rules.timeOn}
                onChange={(e) => updateRule('timeVal', e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:border-amber-500 disabled:opacity-50 font-bold"
              />
            </div>
          </div>

          {/* Rule 2: Thursday Early Departure (4:00 PM / OT at 4:50 PM) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              (rules.thursdayEarlyShift ?? true) ? 'bg-amber-500/10 border-amber-500/30 shadow-2xs' : 'bg-muted/10 border-border/40 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1.5 cursor-pointer">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('rules.thu_early_title')}</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.thursdayEarlyShift ?? true}
                  onChange={(e) => {
                    updateRule('thursdayEarlyShift', e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="space-y-2">
              <div className="font-mono text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span>{t('rules.thu_checkout')}</span>
                <input
                  type="time"
                  value={rules.thursdayShiftEnd || '16:00'}
                  disabled={!(rules.thursdayEarlyShift ?? true)}
                  onChange={(e) => {
                    updateRule('thursdayShiftEnd', e.target.value);
                  }}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:border-amber-500 disabled:opacity-50 font-bold text-amber-400"
                />
              </div>
              <div className="font-mono text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span>{t('rules.thu_ot_start')}</span>
                <input
                  type="time"
                  value={rules.thursdayOvertimeStart || '16:50'}
                  disabled={!(rules.thursdayEarlyShift ?? true)}
                  onChange={(e) => updateRule('thursdayOvertimeStart', e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:border-amber-500 disabled:opacity-50 font-bold text-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Rule 3: Hours Worked */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              rules.hoursOn ? 'bg-muted/25 border-border shadow-2xs' : 'bg-muted/10 border-border/40 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3.5">
              <label className="text-xs font-bold font-mono text-foreground flex items-center gap-1.5 cursor-pointer">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('rules.worked_hours')}</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.hoursOn}
                  onChange={(e) => updateRule('hoursOn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <div className="font-mono text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span>{t('rules.ot_greater_than')}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={rules.hoursVal}
                  disabled={!rules.hoursOn}
                  onChange={(e) => updateRule('hoursVal', parseFloat(e.target.value) || 0)}
                  className="w-16 bg-background border border-border rounded-xl px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:border-amber-500 disabled:opacity-50 font-bold text-center"
                />
                <span>{t('rules.hrs')}</span>
              </div>
            </div>
          </div>

          {/* Rule 4: Late Arrival Threshold */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              rules.lateOn ? 'bg-rose-500/10 border-rose-500/30 shadow-2xs' : 'bg-muted/10 border-border/40 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3.5">
              <label className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5 cursor-pointer">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{t('rules.late_arrival')}</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rules.lateOn}
                  onChange={(e) => updateRule('lateOn', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
            <div className="font-mono text-xs text-muted-foreground flex items-center justify-between gap-2">
              <span>{t('rules.late_after')}</span>
              <input
                type="time"
                value={rules.lateVal}
                disabled={!rules.lateOn}
                onChange={(e) => updateRule('lateVal', e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:border-rose-500 disabled:opacity-50 font-bold text-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Weekend Days Selector: Sunday, Friday, Saturday */}
        <div className="mt-5 pt-5 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-mono font-bold text-foreground">{t('rules.weekend_title')}</span>
            <span className="text-xs font-mono text-muted-foreground">
              ({formatWeekendNames(rules.weekendDays || [0, 5, 6])})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {DAY_NAMES.map((day) => {
              const isSelected = (rules.weekendDays || [0, 5, 6]).includes(day.index);
              return (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => toggleWeekendDay(day.index)}
                  className={`px-3.5 py-1.5 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-black font-bold border-amber-500 shadow-2xs'
                      : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
