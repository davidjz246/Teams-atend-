import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  User, 
  Building, 
  ShieldCheck, 
  Download, 
  FileSpreadsheet, 
  Info, 
  Check, 
  Filter, 
  MessageSquareQuote, 
  Sparkles, 
  ArrowUpRight 
} from 'lucide-react';
import { OvertimeSubmission, OvertimeDayItem, UserProfile } from '../types';
import { to12Hour, toHM, fmtHours } from '../utils/parser';
import { getTeamById, getTeamForSapId, getTeamUsers } from '../utils/teamDatabase';
import { useLanguage } from '../i18n/LanguageContext';
import * as XLSX from 'xlsx';

interface OvertimeLedgerChartProps {
  submission: OvertimeSubmission | undefined;
  employeeName: string;
  employeeId: string;
  currentUser: UserProfile;
  onOpenStickyNotes?: () => void;
  onSubmitNew?: () => void;
}

export const OvertimeLedgerChart: React.FC<OvertimeLedgerChartProps> = ({
  submission,
  employeeName,
  employeeId,
  currentUser,
  onOpenStickyNotes,
  onSubmitNew,
}) => {
  const { t, language } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  if (!submission || !submission.items || submission.items.length === 0) {
    return null;
  }

  const items = submission.items;
  const totalClaimedMins = submission.originalTotalOvertimeMinutes ?? items.reduce((s, i) => s + (i.originalOvertimeMinutes ?? i.overtimeMinutes), 0);
  const totalAuthorizedMins = submission.totalOvertimeMinutes;
  
  // Resolve assigned team leader
  const assignedTeam = (submission.teamId ? getTeamById(submission.teamId) : undefined) || getTeamForSapId(submission.employeeId);
  const teamUsers = getTeamUsers();
  const leaderUser = submission.teamLeaderSapId
    ? teamUsers.find((u) => u.sapId === submission.teamLeaderSapId)
    : assignedTeam?.leaderSapId
    ? teamUsers.find((u) => u.sapId === assignedTeam.leaderSapId)
    : undefined;
  
  const leaderDisplayName = leaderUser?.name || assignedTeam?.leaderName || (submission.teamLeaderSapId ? `TL (SAP #${submission.teamLeaderSapId})` : 'Assigned Team Leader');
  const leaderSapId = leaderUser?.sapId || assignedTeam?.leaderSapId || submission.teamLeaderSapId || '2001';
  const teamDisplayName = submission.teamName || assignedTeam?.name || 'Operations Team Alpha';

  const approvedItems = items.filter((i) => i.status === 'approved');
  const pendingItems = items.filter((i) => i.status === 'pending');
  const rejectedItems = items.filter((i) => i.status === 'rejected');

  const approvedMins = approvedItems.reduce((s, i) => s + i.overtimeMinutes, 0);
  const pendingMins = pendingItems.reduce((s, i) => s + i.overtimeMinutes, 0);
  const rejectedMins = rejectedItems.reduce((s, i) => s + (i.originalOvertimeMinutes ?? i.overtimeMinutes), 0);

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const handleExportOvertimeAuditExcel = () => {
    const headers = [
      'Employee Name',
      'SAP ID',
      'Department',
      'Assigned Team',
      'Assigned Team Leader',
      'Date',
      'Day',
      'Standard Shift End',
      'Actual Check-Out',
      'Claimed OT Duration',
      'Authorized OT Duration',
      'Hours Adjusted by TL?',
      'Employee Overtime Justification',
      'Team Leader Decision Status',
      'Team Leader Decision Reason / Notes',
      'Reviewed By',
      'Reviewed Timestamp',
    ];

    const rows = items.map((item) => [
      submission.employeeName,
      submission.employeeId,
      submission.department,
      teamDisplayName,
      `${leaderDisplayName} (SAP #${leaderSapId})`,
      item.date,
      item.dayOfWeek,
      to12Hour(item.shiftEndStandard + ':00'),
      to12Hour(item.endTime),
      toHM(item.originalOvertimeMinutes ?? item.overtimeMinutes),
      toHM(item.overtimeMinutes),
      item.isAdjustedByLeader ? 'YES (Adjusted)' : 'NO',
      item.reason || 'N/A',
      item.status === 'approved' ? 'APPROVED' : item.status === 'rejected' ? 'DENIED / REJECTED' : 'PENDING REVIEW',
      item.adjustedReason || item.leaderNotes || (item.status === 'approved' ? 'Verified & Authorized' : item.status === 'rejected' ? 'Declined by Team Leader' : 'Awaiting Review'),
      item.decidedBy || submission.reviewedBy || 'Pending',
      item.decidedAt ? new Date(item.decidedAt).toLocaleString() : submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString() : 'Pending',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Overtime_Audit_Report');
    XLSX.writeFile(wb, `Overtime_Audit_${submission.employeeId}_${submission.employeeName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 mb-6 shadow-sm overflow-hidden space-y-5">
      {/* Header & Routing Information */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('ot_chart.header_tag', 'Official Overtime Submissions & Approvals Chart')}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
              {submission.status === 'approved'
                ? `✓ ${t('ot_chart.authorized_by_lead', 'Authorized by Leader')}`
                : submission.status === 'rejected'
                ? `✕ ${t('ot_chart.changes_requested', 'Changes Requested')}`
                : `⏳ ${t('sub.waiting_approval', 'Pending Team Leader Review')}`}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t('ot_chart.title', 'Overtime Tracking & Team Leader Decision Matrix')}
          </h2>

          {/* Team Routing & Assigned Team Leader Transparency */}
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>{submission.employeeName} ({t('export.sap_id', 'SAP ID')}: #{submission.employeeId})</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-foreground font-medium">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('tl.team_label', 'Team')}: {teamDisplayName}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{t('export.approver', 'Assigned Approver')}: {leaderDisplayName} (SAP #{leaderSapId})</span>
            </span>
          </div>
        </div>

        {/* Action Button: Export Audit Excel */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportOvertimeAuditExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
            title="Download full audited overtime log with reasons and leader decisions in Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>{t('ot_chart.export_btn', 'Export Overtime Audit (.xlsx)')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats & Visual Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total OT Claimed */}
        <div className="bg-muted/30 border border-border rounded-2xl p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{t('ot_chart.total_claimed', 'Total Claimed')}</span>
          </div>
          <div className="text-lg font-bold font-mono text-foreground mt-1">
            {toHM(totalClaimedMins)}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {items.length} {t('mgr.days', 'days')} {t('ot_chart.filed', 'filed')}
          </div>
        </div>

        {/* Approved by Leader */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t('sub.approved_by', 'Approved by TL')}</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {toHM(approvedMins)}
          </div>
          <div className="text-[11px] font-mono text-emerald-500/80">
            {approvedItems.length} of {items.length} {t('mgr.days', 'days')} {t('tl.status_approved', 'approved')}
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>{t('tl.status_pending', 'Pending Review')}</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {toHM(pendingMins)}
          </div>
          <div className="text-[11px] font-mono text-amber-500/80">
            {pendingItems.length} {t('mgr.days', 'days')} {t('ot_chart.awaiting', 'awaiting')}
          </div>
        </div>

        {/* Denied / Rejected */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>{t('tl.status_rejected', 'Denied / Rejected')}</span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-1">
            {toHM(rejectedMins)}
          </div>
          <div className="text-[11px] font-mono text-rose-500/80">
            {rejectedItems.length} {t('mgr.days', 'days')} {t('ot_chart.declined', 'declined')}
          </div>
        </div>
      </div>

      {/* Visual Hours Distribution Bar */}
      <div className="p-3.5 bg-muted/20 border border-border rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-muted-foreground font-bold">{t('ot_chart.dist_title', 'Approval Distribution:')}</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{t('tl.status_approved', 'Approved')} ({Math.round((approvedMins / Math.max(totalClaimedMins, 1)) * 100)}%)</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{t('tl.status_pending', 'Pending')} ({Math.round((pendingMins / Math.max(totalClaimedMins, 1)) * 100)}%)</span>
            </span>
            {rejectedMins > 0 && (
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{t('tl.status_rejected', 'Denied')} ({Math.round((rejectedMins / Math.max(totalClaimedMins, 1)) * 100)}%)</span>
              </span>
            )}
          </div>
        </div>

        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
          {approvedMins > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(approvedMins / Math.max(totalClaimedMins, 1)) * 100}%` }}
              title={`Approved: ${toHM(approvedMins)}`}
            />
          )}
          {pendingMins > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${(pendingMins / Math.max(totalClaimedMins, 1)) * 100}%` }}
              title={`Pending: ${toHM(pendingMins)}`}
            />
          )}
          {rejectedMins > 0 && (
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${(rejectedMins / Math.max(totalClaimedMins, 1)) * 100}%` }}
              title={`Denied: ${toHM(rejectedMins)}`}
            />
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg font-mono transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-card text-foreground font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('ot_chart.filter_all', 'All Overtime')} ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1 text-xs rounded-lg font-mono transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-500 text-white font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-emerald-400'
            }`}
          >
            ✓ {t('tl.status_approved', 'Approved')} ({approvedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 text-xs rounded-lg font-mono transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-black font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-amber-400'
            }`}
          >
            ⏳ {t('tl.status_pending', 'Pending')} ({pendingItems.length})
          </button>
          {rejectedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1 text-xs rounded-lg font-mono transition-all cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-rose-400'
              }`}
            >
              ✕ {t('tl.status_rejected', 'Denied')} ({rejectedItems.length})
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {t('tl.showing_count', 'Showing {filtered} of {total} records').replace('{filtered}', String(filteredItems.length)).replace('{total}', String(items.length))}
        </div>
      </div>

      {/* Detailed Overtime Days Breakdown Table */}
      <div className="border border-border rounded-2xl overflow-x-auto bg-card shadow-2xs">
        <table className="w-full text-left text-xs border-collapse min-w-[780px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-mono uppercase text-[11px]">
              <th className="p-3 font-bold">{t('tl.col_date_day', 'Date & Day')}</th>
              <th className="p-3 font-bold">{t('ot_chart.col_punch', 'Punch Timestamps')}</th>
              <th className="p-3 font-bold">{t('ot_chart.col_duration', 'Overtime Duration')}</th>
              <th className="p-3 font-bold">{t('ot_chart.col_employee_reason', 'Employee Reason / Justification')}</th>
              <th className="p-3 font-bold">{t('ot_chart.col_decision', 'TL Decision Status')}</th>
              <th className="p-3 font-bold">{t('ot_chart.col_leader_feedback', 'Team Leader Reason / Feedback')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.map((item) => {
              const isAdjusted = item.isAdjustedByLeader;
              const claimedDuration = item.originalOvertimeMinutes ?? item.overtimeMinutes;
              const isApproved = item.status === 'approved';
              const isRejected = item.status === 'rejected';
              const isPending = item.status === 'pending';

              const leaderNote = item.adjustedReason || item.leaderNotes || (
                isApproved 
                  ? 'Verified & Authorized by Team Leader' 
                  : isRejected 
                  ? 'Declined by Team Leader' 
                  : 'Awaiting review'
              );

              return (
                <tr
                  key={item.date}
                  className={`hover:bg-muted/20 transition-colors ${
                    isApproved
                      ? 'hover:bg-emerald-500/5'
                      : isRejected
                      ? 'hover:bg-rose-500/5'
                      : 'hover:bg-amber-500/5'
                  }`}
                >
                  {/* Date & Day */}
                  <td className="p-3 align-top font-mono">
                    <div className="font-bold text-foreground">{item.date}</div>
                    <div className="text-[11px] text-muted-foreground">{item.dayOfWeek}</div>
                  </td>

                  {/* Punch Timestamps */}
                  <td className="p-3 align-top font-mono">
                    <div className="text-muted-foreground">
                      {t('rules.shift_end_std', 'Shift End')}: <strong className="text-foreground">{to12Hour(item.shiftEndStandard + ':00')}</strong>
                    </div>
                    <div className="text-muted-foreground">
                      {t('ot_chart.checkout', 'Check-Out')}: <strong className="text-foreground">{to12Hour(item.endTime)}</strong>
                    </div>
                  </td>

                  {/* Overtime Duration */}
                  <td className="p-3 align-top font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isAdjusted ? (
                        <>
                          <span className="line-through text-muted-foreground text-[11px]">
                            {toHM(claimedDuration)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {toHM(item.overtimeMinutes)}
                          </span>
                          <span className="text-[10px] text-amber-500 font-bold uppercase block w-full">
                            ({t('tl.hours_adjusted_badge', 'Hours Adjusted by TL')})
                          </span>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-muted text-foreground border border-border">
                          {toHM(item.overtimeMinutes)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Employee Reason */}
                  <td className="p-3 align-top">
                    <div className="max-w-xs text-foreground leading-relaxed">
                      {item.reason ? (
                        <span className="font-medium">{item.reason}</span>
                      ) : (
                        <span className="text-rose-400 italic font-mono text-[11px]">{t('export.err_reasons', 'No reason provided')}</span>
                      )}
                    </div>
                  </td>

                  {/* TL Decision Status Badge */}
                  <td className="p-3 align-top font-mono">
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('tl.status_approved', 'Approved')}</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t('tl.status_rejected', 'Denied')}</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('tl.status_pending', 'Pending')}</span>
                      </span>
                    )}
                  </td>

                  {/* Team Leader Reason / Feedback */}
                  <td className="p-3 align-top font-mono">
                    <div className="max-w-sm space-y-1">
                      <div className={`text-xs ${
                        isApproved 
                          ? 'text-emerald-400 font-medium' 
                          : isRejected 
                          ? 'text-rose-400 font-medium' 
                          : 'text-amber-400/90 font-medium'
                      }`}>
                        &ldquo;{leaderNote}&rdquo;
                      </div>
                      
                      {(item.decidedBy || submission.reviewedBy) && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{t('ot_chart.reviewed_by', 'Reviewed by:')} <strong className="text-foreground">{item.decidedBy || submission.reviewedBy}</strong></span>
                          {item.decidedAt && (
                            <span>• {new Date(item.decidedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
