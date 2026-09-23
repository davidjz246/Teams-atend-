import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, FileText, Clock } from 'lucide-react';
import { DayClassification, PermissionStatus } from '../types';
import { fmtHours, to12Hour, weekdayFullOf } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface LateAlertBannerProps {
  lateDays: DayClassification[];
  lateThresholdVal: string;
  permissionsFiled: Record<string, PermissionStatus>;
  onTogglePermission: (date: string) => void;
  employeeName: string;
  employeeId: string;
}

export const LateAlertBanner: React.FC<LateAlertBannerProps> = ({
  lateDays,
  lateThresholdVal,
  permissionsFiled,
  onTogglePermission,
  employeeName,
  employeeId,
}) => {
  const { t } = useLanguage();
  const [copiedDate, setCopiedDate] = useState<string | null>(null);

  if (lateDays.length === 0) {
    return null;
  }

  const handleCopyPermissionText = (day: DayClassification) => {
    const timeFormatted = day.row.start ? to12Hour(day.row.start) : '—';
    const thresholdFormatted = to12Hour(lateThresholdVal + ':00');
    const dayName = weekdayFullOf(day.row.date);

    const permissionMessage = `LATE ARRIVAL PERMISSION REQUEST
---------------------------------
Employee Name: ${employeeName || 'N/A'}
Employee ID: ${employeeId || 'N/A'}
Date: ${day.row.date} (${dayName})
Check-in Time: ${timeFormatted}
Official Threshold: ${thresholdFormatted}
Delay Duration: ${fmtHours(day.lateMin)}

Reason: Requesting late arrival permission for ${day.row.date} due to traffic / delay. Please excuse this late check-in.`;

    navigator.clipboard.writeText(permissionMessage);
    setCopiedDate(day.row.date);
    setTimeout(() => setCopiedDate(null), 3000);
  };

  return (
    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl p-6 mb-6 shadow-sm overflow-hidden">
      <div className="flex items-start gap-4 mb-4 border-b border-rose-200 dark:border-rose-500/20 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/20">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-base text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <span>{t('late.title')}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-mono font-bold">
                {lateDays.length} {t('hero.late_days')}
              </span>
            </h3>
          </div>
          <p className="text-xs text-rose-800 dark:text-rose-200/80 mt-1">
            {t('late.desc').replace('{threshold}', to12Hour(lateThresholdVal + ':00'))}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {lateDays.map((day) => {
          const isFiled = permissionsFiled[day.row.date] === 'filed';
          const isCopied = copiedDate === day.row.date;

          return (
            <div
              key={day.row.date}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isFiled
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-card border-rose-200 dark:border-rose-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${isFiled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-foreground">{day.row.date}</span>
                    <span className="text-xs text-muted-foreground">({weekdayFullOf(day.row.date)})</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-500/30">
                      {t('late.in_at').replace('{time}', to12Hour(day.row.start)).replace('{mins}', fmtHours(day.lateMin))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFiled ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 inline" /> {t('late.status_filed')}
                      </span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400 font-medium">
                        {t('late.reminder')} ({fmtHours(day.lateMin)})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <button
                  onClick={() => handleCopyPermissionText(day)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-accent text-xs font-mono transition-colors text-foreground font-medium cursor-pointer"
                  title="Copy ready-to-send permission request template"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isCopied ? t('late.copied') : t('late.copy_template')}</span>
                </button>

                <button
                  onClick={() => onTogglePermission(day.row.date)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md cursor-pointer ${
                    isFiled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {isFiled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('late.filed')}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t('late.mark_filed')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
