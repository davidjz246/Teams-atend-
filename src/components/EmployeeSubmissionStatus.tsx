import React from 'react';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, UserCheck, ShieldCheck, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { OvertimeSubmission, UserRole } from '../types';
import { toHM } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface EmployeeSubmissionStatusProps {
  submission: OvertimeSubmission | undefined;
  employeeName: string;
  employeeId: string;
  onNavigateToApprovals: () => void;
  onSubmitNew: () => void;
  onExport?: () => void;
  overtimeCount: number;
  currentUserRole?: UserRole;
  assignedTeamName?: string;
  assignedTeamLeaderName?: string;
  assignedTeamLeaderSapId?: string;
}

export const EmployeeSubmissionStatus: React.FC<EmployeeSubmissionStatusProps> = ({
  submission,
  employeeName,
  employeeId,
  onNavigateToApprovals,
  onSubmitNew,
  onExport,
  overtimeCount,
  currentUserRole = 'employee',
  assignedTeamName,
  assignedTeamLeaderName,
  assignedTeamLeaderSapId,
}) => {
  const { t } = useLanguage();
  const leaderName = assignedTeamLeaderName || submission?.reviewedBy || t('role.team_leader');
  const leaderSap = assignedTeamLeaderSapId || submission?.teamLeaderSapId || '2001';
  const teamName = assignedTeamName || submission?.teamName || 'Operations Alpha';

  if (!submission) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  {t('sub.title')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                  {t('sub.draft')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>{t('export.approver')} {leaderName} (SAP #{leaderSap})</span>
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-1">
                {overtimeCount > 0
                  ? t('sub.draft_desc_ot').replace('{count}', String(overtimeCount)).replace('{leader}', leaderName).replace('{team}', teamName)
                  : t('sub.draft_desc_none').replace('{leader}', leaderName)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-card border border-border hover:bg-muted text-foreground shadow-sm flex items-center gap-2 cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>{t('export.export_btn')}</span>
              </button>
            )}
            {overtimeCount > 0 && (
              <button
                type="button"
                onClick={onSubmitNew}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-sm flex items-center gap-2 cursor-pointer transition-all shrink-0 whitespace-nowrap"
              >
                <span>{t('sub.submit_to')} {leaderName}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isPending = submission.status === 'pending';
  const isApproved = submission.status === 'approved';
  const isRejected = submission.status === 'rejected';

  return (
    <div
      className={`border-2 rounded-2xl p-4 sm:p-6 shadow-md mb-6 transition-all ${
        isPending
          ? 'bg-amber-500/10 border-amber-500/50 shadow-amber-500/5'
          : isApproved
          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-500/5'
          : 'bg-rose-500/10 border-rose-500/50 shadow-rose-500/5'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isPending
                ? 'bg-amber-500 text-black'
                : isApproved
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {isPending ? (
              <Clock className="w-6 h-6 animate-spin" />
            ) : isApproved ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                {t('sub.req_title')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold tracking-wide uppercase ${
                  isPending
                    ? 'bg-amber-500 text-black animate-pulse'
                    : isApproved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {isPending
                  ? `⏳ ${t('sub.waiting_approval')} ${leaderName.toUpperCase()}`
                  : isApproved
                  ? `✓ ${t('sub.approved_by')} ${leaderName.toUpperCase()}`
                  : `❌ ${t('sub.rejected_by')} ${leaderName.toUpperCase()}`}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-background/80 text-foreground border border-border">
                <UserCheck className="w-3 h-3 text-amber-500" />
                <span>{t('export.approver')} {leaderName} (SAP #{leaderSap})</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
              {isPending && (
                <span>
                  {t('sub.routed_msg').replace('{name}', submission.employeeName).replace('{leader}', leaderName).replace('{team}', teamName)}
                </span>
              )}
              {isApproved && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t('sub.approved_msg').replace('{leader}', leaderName).replace('{time}', toHM(submission.totalOvertimeMinutes))}
                </span>
              )}
              {isRejected && (
                <span className="text-rose-600 dark:text-rose-400">
                  {t('sub.feedback_from').replace('{leader}', leaderName)}: {submission.leaderComments || t('sub.feedback_fallback')}
                </span>
              )}
            </h3>

            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1 flex-wrap">
              <span>{t('sub.period')} <strong>{submission.periodLabel}</strong></span>
              <span>•</span>
              <span>{t('sub.team')} <strong className="text-foreground">{teamName}</strong></span>
              <span>•</span>
              <span>{t('sub.total_ot')} <strong className="text-foreground">{toHM(submission.totalOvertimeMinutes)}</strong> ({submission.items.length} {t('rules.hrs')})</span>
              <span>•</span>
              <span>{t('sub.submitted')} {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(submission.submittedAt).toLocaleDateString()}</span>
              {submission.reviewedBy && (
                <>
                  <span>•</span>
                  <span>{t('sub.reviewed_by')} <strong className="text-foreground">{submission.reviewedBy}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-card border border-border hover:bg-muted text-foreground shadow-sm flex items-center gap-2 cursor-pointer transition-all shrink-0 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>{t('export.export_btn')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSubmitNew}
            className="px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            title="Update or resubmit changes with duplicate prevention check"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('sub.update_resubmit')}</span>
          </button>

          {currentUserRole !== 'employee' && (
            <button
              type="button"
              onClick={onNavigateToApprovals}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                isPending
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 ring-2 ring-amber-500/40'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              <span>{t('portal.open_tl')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
