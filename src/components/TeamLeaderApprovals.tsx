import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Calendar, 
  Building, 
  Filter, 
  Download, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Check,
  Edit3,
  RotateCcw,
  AlertCircle,
  Save,
  Sliders,
  Sparkles,
  Info,
  Trash2,
  Lock,
  Users
} from 'lucide-react';
import { ApprovalStatus, OvertimeDayItem, OvertimeSubmission, TeamInfo, UserProfile } from '../types';
import { 
  getSubmissions, 
  updateEntireSubmissionStatus, 
  updateItemApproval, 
  updateItemOvertimeAdjustment, 
  resetItemOvertimeAdjustment,
  deleteSubmission,
  filterSubmissionsForUser,
  getTeams,
  getTeamForSapId,
  getTeamById
} from '../utils/teamDatabase';
import { fmtHours, to12Hour, toHM } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';
import * as XLSX from 'xlsx';

interface TeamLeaderApprovalsProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: 'team_leader_approvals' | 'manager_overview' | 'employee_ledger') => void;
}

export const TeamLeaderApprovals: React.FC<TeamLeaderApprovalsProps> = ({ currentUser, onNavigateTab }) => {
  const { t, language } = useLanguage();
  const [submissions, setSubmissions] = useState<OvertimeSubmission[]>(() => getSubmissions());
  const [teams] = useState<TeamInfo[]>(() => getTeams());
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [leaderCommentInputs, setLeaderCommentInputs] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overtime Editing State
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');

  // Reload submissions when database updates
  React.useEffect(() => {
    const handleUpdate = () => {
      setSubmissions(getSubmissions());
    };
    window.addEventListener('team_submissions_updated', handleUpdate);
    return () => window.removeEventListener('team_submissions_updated', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartEdit = (submissionId: string, item: OvertimeDayItem) => {
    const key = `${submissionId}_${item.date}`;
    setEditingItemKey(key);
    setEditHours(Math.floor(item.overtimeMinutes / 60));
    setEditMinutes(item.overtimeMinutes % 60);
    setEditReason(item.adjustedReason || item.leaderNotes || '');
  };

  const handleCancelEdit = () => {
    setEditingItemKey(null);
    setEditHours(0);
    setEditMinutes(0);
    setEditReason('');
  };

  const handleSaveOvertimeAdjustment = (
    submissionId: string,
    date: string,
    approveImmediately: boolean = false
  ) => {
    const totalMins = Math.max(0, (editHours || 0) * 60 + (editMinutes || 0));
    updateItemOvertimeAdjustment(
      submissionId,
      date,
      totalMins,
      editReason,
      approveImmediately,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    setEditingItemKey(null);
    showToast(
      approveImmediately
        ? `Saved & Approved actual overtime (${toHM(totalMins)}) for ${date}`
        : `Updated overtime to ${toHM(totalMins)} for ${date}`
    );
  };

  const handleQuickZeroOut = (submissionId: string, item: OvertimeDayItem) => {
    const defaultReason = 'Adjusted to 0 hrs: Employee was not performing authorized work during this period.';
    updateItemOvertimeAdjustment(
      submissionId,
      item.date,
      0,
      defaultReason,
      true,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    showToast(`Overtime zeroed out and verified for ${item.date}`);
  };

  const handleResetToClaimed = (submissionId: string, item: OvertimeDayItem) => {
    resetItemOvertimeAdjustment(submissionId, item.date);
    setSubmissions(getSubmissions());
    showToast(`Reverted overtime for ${item.date} to original claim`);
  };

  const handleApproveItem = (submissionId: string, date: string) => {
    updateItemApproval(
      submissionId,
      date,
      'approved',
      leaderCommentInputs[`${submissionId}_${date}`] || 'Verified & Authorized by Team Leader',
      currentUser.name
    );
    setSubmissions(getSubmissions());
    showToast(`Approved overtime for ${date}`);
  };

  const handleRejectItem = (submissionId: string, date: string) => {
    updateItemApproval(
      submissionId,
      date,
      'rejected',
      leaderCommentInputs[`${submissionId}_${date}`] || 'Declined by Team Leader',
      currentUser.name
    );
    setSubmissions(getSubmissions());
    showToast(`Rejected overtime for ${date}`);
  };

  const handleDeleteSubmission = (submissionId: string, empName: string) => {
    deleteSubmission(submissionId);
    setSubmissions(getSubmissions());
    showToast(`Removed submission for ${empName}`);
  };

  const handleApproveAll = (submission: OvertimeSubmission) => {
    updateEntireSubmissionStatus(submission.id, 'approved', 'Approved by ' + currentUser.name, currentUser.name);
    setSubmissions(getSubmissions());
    showToast(`All overtime claims approved for ${submission.employeeName}`);
  };

  const handleRejectAll = (submission: OvertimeSubmission) => {
    updateEntireSubmissionStatus(submission.id, 'rejected', 'Declined by ' + currentUser.name, currentUser.name);
    setSubmissions(getSubmissions());
    showToast(`Submission rejected for ${submission.employeeName}`);
  };

  const handleExportApprovedToExcel = (submission: OvertimeSubmission) => {
    const approvedItems = submission.items.filter((i) => i.status === 'approved');
    if (approvedItems.length === 0) {
      alert(t('val.no_ot_export', 'No approved overtime items found to export in this submission.'));
      return;
    }

    const headers = [
      'Employee Name',
      'SAP ID',
      'Department',
      'Team',
      'Date',
      'Day',
      'Standard Shift End',
      'Punch Check-Out',
      'Claimed OT Duration',
      'TL Authorized OT',
      'Hours Adjusted by TL?',
      'Leader Adjustment Justification',
      'Employee Justification',
      'Approval Status',
      'Reviewed & Approved By',
    ];

    const rows = approvedItems.map((item) => [
      submission.employeeName,
      submission.employeeId,
      submission.department,
      submission.teamName || 'N/A',
      item.date,
      item.dayOfWeek,
      to12Hour(item.shiftEndStandard + ':00'),
      to12Hour(item.endTime),
      toHM(item.originalOvertimeMinutes ?? item.overtimeMinutes),
      toHM(item.overtimeMinutes),
      item.isAdjustedByLeader ? 'YES (Hours Corrected)' : 'NO (Accepted as Claimed)',
      item.adjustedReason || item.leaderNotes || 'N/A',
      item.reason,
      item.status.toUpperCase(),
      item.decidedBy || currentUser.name,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TL_Authorized_Overtime');
    XLSX.writeFile(wb, `TL_Approved_${submission.employeeId}_${submission.employeeName.replace(/\s+/g, '_')}.xlsx`);
  };

  // 1. Filter submissions based on team-level access control (review mode excludes TL's self-claim)
  const allowedSubmissions = filterSubmissionsForUser(submissions, currentUser, 'review');

  // 2. Apply status and manager team filter
  const filteredSubmissions = allowedSubmissions.filter((sub) => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesTeam = 
      selectedTeamFilter === 'all' || 
      sub.teamId === selectedTeamFilter ||
      (sub.teamName && sub.teamName.toLowerCase().includes(selectedTeamFilter.toLowerCase()));
    return matchesStatus && matchesTeam;
  });

  const pendingCount = allowedSubmissions.filter((s) => s.status === 'pending').length;
  const approvedCount = allowedSubmissions.filter((s) => s.status === 'approved').length;
  const totalHoursPending = allowedSubmissions
    .filter((s) => s.status === 'pending')
    .reduce((acc, curr) => acc + curr.totalOvertimeMinutes, 0);

  const userTeam = getTeamForSapId(currentUser.sapId) || (currentUser.teamId ? getTeamById(currentUser.teamId) : undefined);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-amber-500 text-black px-4 py-2.5 rounded-xl shadow-xl text-xs font-mono font-bold flex items-center gap-2 animate-bounce border border-amber-400">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xs">
        {onNavigateTab && (
          <div className="mb-4 pb-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wide">
                {t('tl.view_active', 'Active View: Team Leader Approvals (Tab 2)')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateTab('employee_ledger')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>{t('tl.return_tab1', '👈 Return to Tab 1: My Timesheet')}</span>
              </button>
              {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('manager_overview')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>{t('tl.goto_tab3', '👉 Go to Tab 3: Manager Matrix')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {t('tl.portal_title', 'Team Leader Review Portal')}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {t('tl.reviewer', 'Reviewer:')} {currentUser.name} ({t(`role.${currentUser.role}`, currentUser.role.replace('_', ' '))})
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('tl.center_title', 'Overtime Approval & Duration Verification Center')}
            </h2>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[11px] text-amber-500 font-medium uppercase font-mono">{t('tl.pending', 'Pending')}</div>
              <div className="text-lg font-bold text-amber-500 font-mono mt-0.5">{pendingCount} {t('tl.submissions', 'Submissions')}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[11px] text-emerald-500 font-medium uppercase font-mono">{t('tl.approved', 'Approved')}</div>
              <div className="text-lg font-bold text-emerald-500 font-mono mt-0.5">{approvedCount}</div>
            </div>
            <div className="bg-muted/50 border border-border rounded-2xl p-3 text-center min-w-[110px]">
              <div className="text-[11px] text-muted-foreground font-medium uppercase font-mono">{t('tl.pending_hours', 'Pending Hours')}</div>
              <div className="text-lg font-bold text-foreground font-mono mt-0.5">{fmtHours(totalHoursPending)}</div>
            </div>
          </div>
        </div>

        {/* Team-Based Access Isolation Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              {currentUser.role === 'team_leader' ? (
                <span>
                  <strong className="text-foreground">{t('tl.team_scope', 'Team Scope:')}</strong> {userTeam?.name || 'Your Team'} • <span className="text-amber-400 font-semibold">{t('role.manager', 'Reporting Manager')}: {userTeam?.managerName || 'Operations Director'}</span> • (Members: {userTeam?.memberSapIds.length || 0})
                </span>
              ) : currentUser.role === 'employee' ? (
                <span>
                  <strong className="text-foreground">{t('role.employee', 'Employee')}:</strong> {t('tl.emp_scope_desc', 'Viewing submissions belonging to your employee profile in {team}.').replace('{team}', userTeam?.name || 'Assigned Team')}
                </span>
              ) : (
                <span>
                  <strong className="text-foreground">{t('role.manager', 'Manager')}:</strong> {t('tl.mgr_scope_desc', 'Full clearance across all teams and departments.')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('tl.access_enforced', 'Team Access Enforced')}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 mt-5 pt-4 border-t border-border flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase font-mono">{t('tl.status_label', 'Status:')}</span>
              <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs rounded-lg font-mono capitalize transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(`tl.status_${st}`, st)}
                  </button>
                ))}
              </div>
            </div>

            {/* Manager Team Selector Filter */}
            {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase font-mono">{t('tl.team_label', 'Team:')}</span>
                <select
                  value={selectedTeamFilter}
                  onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  className="bg-muted/40 border border-border rounded-xl px-2.5 py-1 text-xs font-mono text-foreground focus:outline-hidden"
                >
                  <option value="all">{t('tl.all_teams', 'All Teams')} ({teams.length})</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Leader: {t.leaderName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {t('tl.showing_count', 'Showing {filtered} of {total} accessible submissions').replace('{filtered}', String(filteredSubmissions.length)).replace('{total}', String(allowedSubmissions.length))}
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{t('tl.no_subs_found', 'No overtime submissions found')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {statusFilter === 'all'
              ? t('tl.no_subs_desc', 'When team members submit overtime from their timesheet, their records within your team will appear here for review and hour adjustment.')
              : t('tl.no_subs_filtered', 'No submissions matching status "{status}" in your assigned team.').replace('{status}', statusFilter)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const pendingItemsCount = sub.items.filter((i) => i.status === 'pending').length;
            const approvedItemsCount = sub.items.filter((i) => i.status === 'approved').length;
            const hasAdjustedItems = sub.items.some((i) => i.isAdjustedByLeader);
            const claimedTotalMins = sub.originalTotalOvertimeMinutes ?? sub.items.reduce((s, i) => s + (i.originalOvertimeMinutes ?? i.overtimeMinutes), 0);
            const currentTotalMins = sub.totalOvertimeMinutes;
            const isTotalAdjusted = hasAdjustedItems && claimedTotalMins !== currentTotalMins;

            return (
              <div
                key={sub.id}
                className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xs transition-all hover:border-border/80"
              >
                {/* Submission Header Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{sub.employeeName}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-muted border border-border text-muted-foreground">
                          SAP #{sub.employeeId}
                        </span>
                        {sub.teamName && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{sub.teamName}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>{t('export.approver', 'Assigned Approver:')} {sub.reviewedBy || currentUser.name}</span>
                        </span>
                        {hasAdjustedItems && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-bold uppercase tracking-wider flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            {t('tl.hours_adjusted_badge', 'Hours Adjusted by TL')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {sub.periodLabel}
                        </span>
                        <span>•</span>
                        <span>{t('sub.submitted', 'Submitted:')} {new Date(sub.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-mono">
                        {isTotalAdjusted ? t('tl.authorized_ot', 'Authorized OT') : t('sub.total_ot', 'Total Overtime')}
                      </div>
                      <div className="text-base font-bold text-foreground font-mono flex items-center justify-end gap-1.5">
                        {isTotalAdjusted ? (
                          <>
                            <span className="line-through text-muted-foreground text-xs">{toHM(claimedTotalMins)}</span>
                            <span className="text-amber-500">{toHM(currentTotalMins)}</span>
                          </>
                        ) : (
                          <span>{toHM(currentTotalMins)}</span>
                        )}
                      </div>
                    </div>

                    <div className="px-3 py-1 rounded-xl text-xs font-semibold font-mono uppercase flex items-center gap-1.5 border">
                      {sub.status === 'pending' && (
                        <span className="text-amber-500">
                          ⏳ {t('tl.status_pending', 'Pending')} ({pendingItemsCount})
                        </span>
                      )}
                      {sub.status === 'approved' && (
                        <span className="text-emerald-500">
                          ✓ {t('tl.status_approved', 'Fully Approved')} ({approvedItemsCount})
                        </span>
                      )}
                      {sub.status === 'rejected' && (
                        <span className="text-rose-500">
                          ✕ {t('tl.status_rejected', 'Rejected')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Expand/collapse submission details"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="border-t border-border p-5 bg-muted/10 space-y-4">
                    {/* Batch Actions Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-mono font-bold text-foreground">
                          {t('tl.batch_review_title', 'Overtime Days Review ({count} days claimed)').replace('{count}', String(sub.items.length))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleApproveAll(sub)}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('tl.approve_all_days', 'Approve All Days')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectAll(sub)}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t('tl.reject_all_days', 'Reject All')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportApprovedToExcel(sub)}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          title="Export TL Approved Ledger to Excel"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-500" />
                          {t('tl.export_approved_excel', 'Export Approved Excel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently clear/remove the submission from ${sub.employeeName}? This allows the employee to submit a clean new request.`)) {
                              handleDeleteSubmission(sub.id, sub.employeeName);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          title="Clear/remove this submission to avoid conflicts and let employee submit fresh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('tl.clear_sub', 'Clear Submission')}
                        </button>
                      </div>
                    </div>

                    {/* Table of Days */}
                    <div className="border border-border rounded-2xl overflow-hidden bg-card">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/60 border-b border-border text-muted-foreground font-mono uppercase text-[11px]">
                            <th className="p-3">{t('tl.col_date_day', 'Date & Day')}</th>
                            <th className="p-3">{t('tl.col_punch_shift', 'Punch Shift')}</th>
                            <th className="p-3">{t('tl.col_claimed_ot', 'Claimed OT')}</th>
                            <th className="p-3">{t('tl.col_authorized_ot', 'TL Authorized OT')}</th>
                            <th className="p-3">{t('tl.col_justification', 'Employee Justification')}</th>
                            <th className="p-3">{t('tl.col_status_actions', 'Status / Actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {sub.items.map((item) => {
                            const isEditing = editingItemKey === `${sub.id}_${item.date}`;
                            const isAdjusted = item.isAdjustedByLeader;
                            const claimedMinutes = item.originalOvertimeMinutes ?? item.overtimeMinutes;

                            return (
                              <tr key={item.date} className={`hover:bg-muted/30 transition-colors ${isEditing ? 'bg-amber-500/5' : ''}`}>
                                {/* Date Column */}
                                <td className="p-3 align-top font-mono">
                                  <div className="font-bold text-foreground">{item.date}</div>
                                  <div className="text-[11px] text-muted-foreground">{item.dayOfWeek}</div>
                                </td>

                                {/* Punch Shift Column */}
                                <td className="p-3 align-top font-mono">
                                  <div className="text-muted-foreground">
                                    {t('rules.shift_end_std', 'Std End')}: <strong className="text-foreground">{to12Hour(item.shiftEndStandard + ':00')}</strong>
                                  </div>
                                  <div className="text-muted-foreground">
                                    Out: <strong className="text-foreground">{to12Hour(item.endTime)}</strong>
                                  </div>
                                </td>

                                {/* Claimed OT */}
                                <td className="p-3 align-top font-mono">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                    isAdjusted ? 'line-through text-muted-foreground bg-muted' : 'bg-muted text-foreground'
                                  }`}>
                                    {toHM(claimedMinutes)}
                                  </span>
                                </td>

                                {/* TL Authorized OT with In-line Hour Editor */}
                                <td className="p-3 align-top font-mono">
                                  {isEditing ? (
                                    <div className="space-y-2 p-3 bg-card rounded-xl border border-amber-500/40 shadow-xs max-w-sm">
                                      <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>{t('tl.edit_ot_title', 'Edit Overtime Duration')}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <div>
                                          <label className="text-[10px] text-muted-foreground block">{t('tl.hours_label', 'Hours')}</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            value={editHours}
                                            onChange={(e) => setEditHours(parseInt(e.target.value) || 0)}
                                            className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground block">{t('tl.mins_label', 'Mins')}</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            step="5"
                                            value={editMinutes}
                                            onChange={(e) => setEditMinutes(parseInt(e.target.value) || 0)}
                                            className="w-16 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground"
                                          />
                                        </div>
                                        <div className="pt-4 text-xs font-bold text-amber-500">
                                          = {toHM((editHours || 0) * 60 + (editMinutes || 0))}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                                          {t('tl.adjust_notes', 'Adjustment Justification / Notes')}
                                        </label>
                                        <input
                                          type="text"
                                          value={editReason}
                                          onChange={(e) => setEditReason(e.target.value)}
                                          placeholder="e.g. Approved only authorized 1 hr portion"
                                          className="w-full px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground"
                                        />
                                      </div>

                                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveOvertimeAdjustment(sub.id, item.date, true)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                          <Check className="w-3 h-3" /> {t('tl.save_approve', 'Save & Approve')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveOvertimeAdjustment(sub.id, item.date, false)}
                                          className="px-2.5 py-1 bg-muted hover:bg-accent text-foreground rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                          <Save className="w-3 h-3" /> {t('tl.save_only', 'Save Only')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                          className="px-2 py-1 text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
                                        >
                                          {t('tl.cancel', 'Cancel')}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                                          isAdjusted 
                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                                            : 'bg-muted text-foreground'
                                        }`}>
                                          {toHM(item.overtimeMinutes)}
                                        </span>
                                        {isAdjusted && (
                                          <span className="text-[10px] text-amber-500 font-bold uppercase">
                                            ({t('tl.hours_adjusted_badge', 'Adjusted')})
                                          </span>
                                        )}
                                      </div>

                                      {/* Quick Adjustment Buttons */}
                                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(sub.id, item)}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-amber-500 font-bold border border-border flex items-center gap-1 cursor-pointer"
                                          title="Edit overtime hours directly"
                                        >
                                          <Edit3 className="w-2.5 h-2.5" />
                                          <span>{t('tl.edit_ot_btn', 'Edit OT')}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleQuickZeroOut(sub.id, item)}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold border border-rose-500/20 cursor-pointer"
                                          title="Zero out (0 hrs) unauthorized work"
                                        >
                                          {t('tl.zero_btn', 'Zero (0h)')}
                                        </button>

                                        {isAdjusted && (
                                          <button
                                            type="button"
                                            onClick={() => handleResetToClaimed(sub.id, item)}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground font-mono flex items-center gap-1 cursor-pointer"
                                            title="Revert back to claimed hours"
                                          >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                            <span>{t('tl.reset_btn', 'Reset')}</span>
                                          </button>
                                        )}
                                      </div>

                                      {item.adjustedReason && (
                                        <div className="text-[10px] text-amber-400 font-mono italic max-w-xs mt-1">
                                          TL Note: &ldquo;{item.adjustedReason}&rdquo;
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Employee Justification */}
                                <td className="p-3 align-top">
                                  <p className="text-xs text-foreground leading-relaxed max-w-md">
                                    {item.reason || <span className="text-rose-400 italic">{t('export.err_reasons', 'No justification provided')}</span>}
                                  </p>
                                </td>

                                {/* Actions & Status */}
                                <td className="p-3 align-top font-mono">
                                  <div className="space-y-2 max-w-xs">
                                    {item.status === 'approved' ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {t('tl.status_approved', 'Approved')}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const note = prompt('Edit decision note for ' + item.date, item.leaderNotes || item.adjustedReason || 'Verified & Authorized');
                                              if (note !== null) {
                                                updateItemApproval(sub.id, item.date, 'approved', note, currentUser.name);
                                                setSubmissions(getSubmissions());
                                                showToast('Updated decision note');
                                              }
                                            }}
                                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                                          >
                                            {t('tl.edit_note', 'Edit note')}
                                          </button>
                                        </div>
                                        {(item.leaderNotes || item.adjustedReason) && (
                                          <div className="text-[11px] text-emerald-400/90 italic">
                                            &ldquo;{item.leaderNotes || item.adjustedReason}&rdquo;
                                          </div>
                                        )}
                                      </div>
                                    ) : item.status === 'rejected' ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1">
                                            <XCircle className="w-3.5 h-3.5" />
                                            {t('tl.status_rejected', 'Rejected / Denied')}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const note = prompt('Edit rejection reason for ' + item.date, item.leaderNotes || item.adjustedReason || 'Declined by Team Leader');
                                              if (note !== null) {
                                                updateItemApproval(sub.id, item.date, 'rejected', note, currentUser.name);
                                                setSubmissions(getSubmissions());
                                                showToast('Updated rejection note');
                                              }
                                            }}
                                            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                                          >
                                            {t('tl.edit_note', 'Edit note')}
                                          </button>
                                        </div>
                                        {(item.leaderNotes || item.adjustedReason) && (
                                          <div className="text-[11px] text-rose-400/90 italic">
                                            &ldquo;{item.leaderNotes || item.adjustedReason}&rdquo;
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          placeholder={t('tl.decision_note_placeholder', 'Decision note / reason (optional)...')}
                                          value={leaderCommentInputs[`${sub.id}_${item.date}`] || ''}
                                          onChange={(e) =>
                                            setLeaderCommentInputs((prev) => ({
                                              ...prev,
                                              [`${sub.id}_${item.date}`]: e.target.value,
                                            }))
                                          }
                                          className="w-full px-2 py-1 text-[11px] rounded-lg bg-background border border-border text-foreground font-mono focus:outline-hidden"
                                        />
                                        
                                        {/* Quick reason chips */}
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLeaderCommentInputs((prev) => ({
                                                ...prev,
                                                [`${sub.id}_${item.date}`]: 'Verified & Authorized for payroll',
                                              }))
                                            }
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer"
                                          >
                                            {t('tl.quick_verified', '+ Verified')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLeaderCommentInputs((prev) => ({
                                                ...prev,
                                                [`${sub.id}_${item.date}`]: 'Denied: Tasks completed during standard shift',
                                              }))
                                            }
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                          >
                                            {t('tl.quick_deny_shift', '+ Deny: Shift done')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setLeaderCommentInputs((prev) => ({
                                                ...prev,
                                                [`${sub.id}_${item.date}`]: 'Denied: Unapproved extra hours',
                                              }))
                                            }
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                          >
                                            {t('tl.quick_deny_unapproved', '+ Deny: Unapproved')}
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => handleApproveItem(sub.id, item.date)}
                                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                          >
                                            <Check className="w-3 h-3" /> {t('tl.approve_btn', 'Approve')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRejectItem(sub.id, item.date)}
                                            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                          >
                                            <XCircle className="w-3 h-3" /> {t('tl.reject_btn', 'Reject')}
                                          </button>
                                        </div>
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
