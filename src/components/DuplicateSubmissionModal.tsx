import React from 'react';
import { AlertTriangle, Clock, RefreshCw, X, ArrowRight, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { OvertimeSubmission } from '../types';
import { toHM } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';

interface DuplicateSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverwrite: () => void;
  existingSubmission: OvertimeSubmission;
  newOvertimeCount: number;
  newTotalOvertimeMinutes: number;
  employeeName: string;
  employeeId: string;
  onNavigateToLeaderTab?: () => void;
  canViewLeaderTab?: boolean;
}

export const DuplicateSubmissionModal: React.FC<DuplicateSubmissionModalProps> = ({
  isOpen,
  onClose,
  onConfirmOverwrite,
  existingSubmission,
  newOvertimeCount,
  newTotalOvertimeMinutes,
  employeeName,
  employeeId,
  onNavigateToLeaderTab,
  canViewLeaderTab = false,
}) => {
  const { t, language } = useLanguage();

  if (!isOpen) return null;

  const isPending = existingSubmission.status === 'pending';
  const isApproved = existingSubmission.status === 'approved';
  const isRejected = existingSubmission.status === 'rejected';

  const formattedDate = new Date(existingSubmission.submittedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(existingSubmission.submittedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-card border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/10 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-amber-500">
                  {t('dup.warning_badge', 'Duplicate Submission Warning')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {t('dup.existing_title', 'Existing Request Already on File')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Details Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs font-mono space-y-2 text-foreground">
          <p className="font-semibold text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              {t('dup.msg_prefix', 'A request for')} <strong>{employeeName}</strong> ({t('export.sap_id', 'SAP ID')}: #{employeeId}) {t('dup.msg_suffix', 'has already been sent to the Team Leader.')}
            </span>
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {t('dup.conflict_warning', 'Submitting a second copy creates duplicates and status conflicts in the Team Leader review queue.')}
          </p>
        </div>

        {/* Existing vs New Comparison Table */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current on file */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-muted-foreground uppercase">
              <History className="w-3.5 h-3.5" />
              <span>{t('dup.current_file', 'Current on File')}</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-base font-bold text-foreground">
                {toHM(existingSubmission.totalOvertimeMinutes)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {existingSubmission.items.length} {existingSubmission.items.length === 1 ? t('mgr.days', 'day') : t('mgr.days', 'days')} {t('ot_chart.filed', 'claimed')}
              </div>
              <div className="pt-1 flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  isPending
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : isApproved
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isPending ? t('tl.status_pending', 'Pending') : isApproved ? t('tl.status_approved', 'Approved') : t('tl.status_rejected', 'Denied')}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground pt-1">
                {t('sub.submitted_label', 'Submitted')} {formattedDate} {t('dup.at_time', 'at')} {formattedTime}
              </div>
            </div>
          </div>

          {/* New submission trying to send */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-500 uppercase">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('dup.new_request', 'New Request')}</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-base font-bold text-foreground">
                {toHM(newTotalOvertimeMinutes)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {newOvertimeCount} {newOvertimeCount === 1 ? t('mgr.days', 'day') : t('mgr.days', 'days')} {t('ot_chart.filed', 'claimed')}
              </div>
              <div className="pt-1 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-black uppercase">
                  {t('tl.status_pending', 'Pending Review')}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground pt-1">
                {t('dup.draft_label', 'Current ledger draft')}
              </div>
            </div>
          </div>
        </div>

        {/* Helpful Info Notice */}
        {isApproved && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>{t('dup.note_label', 'Note:')}</strong> {t('dup.approved_reset_notice', 'The team leader already approved your previous submission. Overwriting it will reset the approval status back to Pending.')}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          {canViewLeaderTab && onNavigateToLeaderTab && (
            <button
              type="button"
              onClick={onNavigateToLeaderTab}
              className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-muted hover:bg-accent text-foreground border border-border transition-all flex items-center justify-center gap-2 cursor-pointer order-2 sm:order-1"
            >
              <span>{t('dup.view_leader_tab', 'View in Team Leader Tab')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all cursor-pointer order-3 sm:order-2"
          >
            {t('common.cancel', 'Cancel')}
          </button>

          <button
            type="button"
            onClick={onConfirmOverwrite}
            className="px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('dup.overwrite_btn', 'Overwrite & Resubmit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
