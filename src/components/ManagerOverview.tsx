import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  Building, 
  Download, 
  Search, 
  X, 
  TrendingUp, 
  Award, 
  Sparkles, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Edit3,
  UserCheck,
  ArrowRightLeft,
  Check,
  AlertCircle,
  Filter,
  Star,
  Briefcase
} from 'lucide-react';
import { OvertimeSubmission, TeamInfo, UserProfile } from '../types';
import { 
  getSubmissions, 
  getTeamUsers, 
  getTeams, 
  filterSubmissionsForUser,
  updateEntireSubmissionStatus,
  updateItemApproval,
  reassignEmployeeToTeam
} from '../utils/teamDatabase';
import { normalizeEmployeeId } from '../utils/employeeDirectory';
import { fmtHours, to12Hour, toHM } from '../utils/parser';
import { useLanguage } from '../i18n/LanguageContext';
import * as XLSX from 'xlsx';

interface ManagerOverviewProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: 'team_leader_approvals' | 'manager_overview' | 'employee_ledger') => void;
}

export const ManagerOverview: React.FC<ManagerOverviewProps> = ({ currentUser, onNavigateTab }) => {
  const { t, language } = useLanguage();
  const [submissions, setSubmissions] = useState<OvertimeSubmission[]>(() => getSubmissions());
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>(() => getTeamUsers());
  const [teams, setTeams] = useState<TeamInfo[]>(() => getTeams());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<OvertimeSubmission | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [viewSection, setViewSection] = useState<'all' | 'leaders' | 'reassign'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reassignment local state mapping: employeeSap -> targetTeamId
  const [reassignMap, setReassignMap] = useState<Record<string, string>>({});

  // Sync when storage updates
  React.useEffect(() => {
    const handleUpdate = () => {
      setSubmissions(getSubmissions());
      setTeams(getTeams());
      setTeamUsers(getTeamUsers());
    };
    window.addEventListener('team_submissions_updated', handleUpdate);
    window.addEventListener('teams_updated', handleUpdate);
    window.addEventListener('team_users_updated', handleUpdate);
    return () => {
      window.removeEventListener('team_submissions_updated', handleUpdate);
      window.removeEventListener('teams_updated', handleUpdate);
      window.removeEventListener('team_users_updated', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter based on user role and permissions (Managers & Admins see all)
  const allowedSubmissions = filterSubmissionsForUser(submissions, currentUser);

  // Identify Team Leader submissions (which strictly require Manager approval)
  const leaderSubmissions = allowedSubmissions.filter((s) => {
    if (s.submitterRole === 'team_leader') return true;
    const cleanId = normalizeEmployeeId(s.employeeId);
    return teams.some((t) => normalizeEmployeeId(t.leaderSapId) === cleanId);
  });

  const pendingLeaderSubmissions = leaderSubmissions.filter((s) => s.status === 'pending');

  // Compute aggregated team statistics
  const totalTeamOvertimeMinutes = allowedSubmissions.reduce((acc, s) => acc + s.totalOvertimeMinutes, 0);
  const approvedOvertimeMinutes = allowedSubmissions.reduce((acc, s) => {
    const appMin = s.items.filter((i) => i.status === 'approved').reduce((sum, item) => sum + item.overtimeMinutes, 0);
    return acc + appMin;
  }, 0);
  const pendingOvertimeMinutes = allowedSubmissions.reduce((acc, s) => {
    const penMin = s.items.filter((i) => i.status === 'pending').reduce((sum, item) => sum + item.overtimeMinutes, 0);
    return acc + penMin;
  }, 0);

  const departments = Array.from(new Set(allowedSubmissions.map((s) => s.department).concat(teamUsers.map((u) => u.department))));

  // Filter list based on selected tab and search criteria
  const filteredSubmissions = allowedSubmissions.filter((sub) => {
    if (viewSection === 'leaders') {
      const isLeader = sub.submitterRole === 'team_leader' || teams.some((t) => normalizeEmployeeId(t.leaderSapId) === normalizeEmployeeId(sub.employeeId));
      if (!isLeader) return false;
    }
    const matchQuery = 
      sub.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.employeeId.includes(searchQuery) ||
      sub.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.teamName && sub.teamName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchDept = departmentFilter === 'all' || sub.department === departmentFilter;
    const matchTeam = teamFilter === 'all' || sub.teamId === teamFilter;
    return matchQuery && matchDept && matchTeam;
  });

  // Manager Approval Actions
  const handleManagerApproveSubmission = (sub: OvertimeSubmission) => {
    updateEntireSubmissionStatus(
      sub.id,
      'approved',
      `Approved by Manager ${currentUser.name}`,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(null);
    }
    showToast(`✓ Overtime approved for ${sub.employeeName} (${sub.submitterRole === 'team_leader' ? 'Team Leader' : 'Employee'})`);
  };

  const handleManagerRejectSubmission = (sub: OvertimeSubmission) => {
    updateEntireSubmissionStatus(
      sub.id,
      'rejected',
      `Declined by Manager ${currentUser.name}`,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    if (selectedSubmission?.id === sub.id) {
      setSelectedSubmission(null);
    }
    showToast(`✕ Overtime request rejected for ${sub.employeeName}`);
  };

  const handleManagerApproveItem = (submissionId: string, date: string) => {
    updateItemApproval(
      submissionId,
      date,
      'approved',
      `Verified & Signed off by Manager ${currentUser.name}`,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    if (selectedSubmission?.id === submissionId) {
      const updated = getSubmissions().find((s) => s.id === submissionId);
      if (updated) setSelectedSubmission(updated);
    }
    showToast(`✓ Day ${date} approved by Manager`);
  };

  const handleManagerRejectItem = (submissionId: string, date: string) => {
    updateItemApproval(
      submissionId,
      date,
      'rejected',
      `Declined by Manager ${currentUser.name}`,
      currentUser.name
    );
    setSubmissions(getSubmissions());
    if (selectedSubmission?.id === submissionId) {
      const updated = getSubmissions().find((s) => s.id === submissionId);
      if (updated) setSelectedSubmission(updated);
    }
    showToast(`✕ Day ${date} rejected by Manager`);
  };

  // Reassignment Handler
  const handleExecuteReassign = (employeeSap: string) => {
    const targetTeamId = reassignMap[employeeSap];
    if (!targetTeamId) {
      alert('Please select a target Team Leader / Team first.');
      return;
    }

    const targetTeam = teams.find((t) => t.id === targetTeamId);
    if (!targetTeam) return;

    reassignEmployeeToTeam(employeeSap, targetTeamId);
    setTeamUsers(getTeamUsers());
    setTeams(getTeams());
    setSubmissions(getSubmissions());
    
    // Clear selection
    setReassignMap((prev) => {
      const next = { ...prev };
      delete next[employeeSap];
      return next;
    });

    const empUser = teamUsers.find((u) => normalizeEmployeeId(u.sapId) === normalizeEmployeeId(employeeSap));
    showToast(`✓ Employee ${empUser?.name || `#${employeeSap}`} now reports to Team Leader: ${targetTeam.leaderName} (${targetTeam.name})`);
  };

  // Export Master Consolidated Company Excel
  const handleExportMasterConsolidatedExcel = () => {
    if (allowedSubmissions.length === 0) {
      alert(t('val.no_ot_export', 'No overtime submissions available to export.'));
      return;
    }

    const headers = [
      'Employee Name',
      'SAP ID',
      'Role / Submitter Level',
      'Team Name',
      'Team Leader',
      'Reporting Manager',
      'Department',
      'Date',
      'Day',
      'Standard Shift End',
      'Check-out Time',
      'Claimed OT Duration',
      'Authorized OT',
      'Adjusted by Lead/Manager?',
      'Adjustment Justification',
      'Mandatory Reason / Justification',
      'Approval Status',
      'Reviewed & Decided By',
    ];

    const allRows: (string | number)[][] = [];

    allowedSubmissions.forEach((sub) => {
      sub.items.forEach((item) => {
        allRows.push([
          sub.employeeName,
          sub.employeeId,
          sub.submitterRole === 'team_leader' ? 'Team Leader' : 'Employee',
          sub.teamName || 'N/A',
          sub.teamLeaderName || (sub.submitterRole === 'team_leader' ? 'Reports to Manager' : 'Team Leader'),
          sub.managerName || 'Operations Director',
          sub.department,
          item.date,
          item.dayOfWeek,
          to12Hour(item.shiftEndStandard + ':00'),
          to12Hour(item.endTime),
          toHM(item.originalOvertimeMinutes ?? item.overtimeMinutes),
          toHM(item.overtimeMinutes),
          item.isAdjustedByLeader ? 'YES (Adjusted)' : 'NO',
          item.adjustedReason || item.leaderNotes || 'N/A',
          item.reason,
          item.status.toUpperCase(),
          item.decidedBy || sub.reviewedBy || 'Pending Signoff',
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...allRows]);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 35 },
      { wch: 50 },
      { wch: 16 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master_Company_Overtime');
    XLSX.writeFile(wb, `WDC_Master_Department_Overtime_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const employeesList = teamUsers.filter((u) => u.role === 'employee');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-mono font-bold flex items-center gap-2 animate-bounce border border-indigo-400">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xs">
        {onNavigateTab && (
          <div className="mb-4 pb-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wide">
                {t('mgr.view_active', 'Active View: Manager Overview & Team Matrix (Tab 3)')}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onNavigateTab('employee_ledger')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-muted hover:bg-accent text-foreground border border-border flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>{t('mgr.return_tab1', '👈 Return to Tab 1: Employee Timesheet')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('team_leader_approvals')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>{t('mgr.goto_tab2', '👉 Go to Tab 2: Team Leader Approvals')}</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {t('mgr.portal_title', 'Executive Manager Portal')}
              </span>
              <span className="text-xs text-muted-foreground font-mono font-bold">
                {t('role.manager', 'Manager')}: {currentUser.name}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('mgr.matrix_title', 'Department Overtime Matrix & Executive Overview')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Full visibility over all teams, employee rosters, and team leaders. Team Leaders report directly to the Manager for overtime signoff.
            </p>
          </div>

          {/* Master Export Button */}
          <button
            type="button"
            onClick={handleExportMasterConsolidatedExcel}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 cursor-pointer shadow-2xs shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('mgr.export_master_btn', 'Export Master Company Excel')}</span>
          </button>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-border">
          <div className="bg-muted/40 border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{t('mgr.kpi_total_claimed', 'Total Overtime Claimed')}</span>
            </div>
            <div className="text-2xl font-bold text-foreground font-mono mt-1">
              {fmtHours(totalTeamOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{t('mgr.kpi_assigned_scope', 'Across company scope')}</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <Award className="w-3.5 h-3.5" />
              <span>{t('mgr.kpi_approved_ot', 'Approved Overtime')}</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {fmtHours(approvedOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">{t('mgr.kpi_ready_payroll', 'Ready for payroll export')}</div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('mgr.kpi_pending_review', 'Pending TL Reviews')}</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
              {fmtHours(pendingOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">{t('mgr.kpi_awaiting_lead', 'Employee claims with Team Leaders')}</div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
              <Star className="w-3.5 h-3.5" />
              <span>Team Leader Signoffs</span>
            </div>
            <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
              {pendingLeaderSubmissions.length} Pending
            </div>
            <div className="text-[11px] text-indigo-400/80 mt-0.5">TL claims awaiting Manager signoff</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewSection === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-muted/60 hover:bg-muted text-foreground'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>All Staff Overtime Matrix ({allowedSubmissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewSection('leaders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewSection === 'leaders'
                ? 'bg-amber-500 text-black shadow-2xs'
                : 'bg-muted/60 hover:bg-muted text-foreground'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Team Leader Submissions ({leaderSubmissions.length})</span>
            {pendingLeaderSubmissions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                {pendingLeaderSubmissions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewSection('reassign')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewSection === 'reassign'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-muted/60 hover:bg-muted text-foreground'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Reassign Employees to Team Leaders ({employeesList.length})</span>
          </button>
        </div>

        {/* Search & Team Filter (for matrix views) */}
        {viewSection !== 'reassign' && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, SAP, team..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-xl border border-border bg-background text-foreground focus:outline-hidden"
              />
            </div>

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="text-xs font-mono rounded-xl border border-border bg-background px-3 py-1.5 text-foreground focus:outline-hidden"
            >
              <option value="all">All Teams ({teams.length})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SECTION 1 & 2: STAFF & TEAM LEADER OVERTIME MATRIX */}
      {viewSection !== 'reassign' && (
        <>
          {filteredSubmissions.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-2xs">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="text-base font-semibold text-foreground">
                {viewSection === 'leaders' ? 'No Team Leader Overtime Claims Found' : t('mgr.no_records', 'No Employee Records Found')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {viewSection === 'leaders'
                  ? 'When Team Leaders submit their overtime timesheets, they will appear here directly for your Manager review and approval.'
                  : t('mgr.no_records_desc', 'When employees submit their monthly timesheets and overtime claims, their details and justifications will appear here.')}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide font-mono text-muted-foreground flex items-center gap-2">
                  {viewSection === 'leaders' ? (
                    <>
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>Team Leader Overtime Claims (Awaiting Manager Signoff)</span>
                    </>
                  ) : (
                    <span>{t('mgr.matrix_subhead', 'Staff & Team Leader Overtime Matrix (Click any row for details & review)')}</span>
                  )}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {filteredSubmissions.length} Submissions Listed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-mono text-[11px] border-b border-border">
                    <tr>
                      <th className="py-3 px-4">{t('mgr.col_emp', 'Staff Member')}</th>
                      <th className="py-3 px-4">Role Level</th>
                      <th className="py-3 px-4">{t('export.sap_id', 'SAP ID')}</th>
                      <th className="py-3 px-4">{t('tl.team_label', 'Team')}</th>
                      <th className="py-3 px-4">Reporting Approver</th>
                      <th className="py-3 px-4">{t('mgr.col_ot_days', 'OT Days')}</th>
                      <th className="py-3 px-4">{t('mgr.col_total_hrs', 'Total Hours')}</th>
                      <th className="py-3 px-4">{t('mgr.col_state', 'Approval State')}</th>
                      <th className="py-3 px-4 text-right">Manager Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubmissions.map((sub) => {
                      const isLeader = sub.submitterRole === 'team_leader' || teams.some((t) => normalizeEmployeeId(t.leaderSapId) === normalizeEmployeeId(sub.employeeId));
                      const approvedItems = sub.items.filter((i) => i.status === 'approved').length;

                      return (
                        <tr
                          key={sub.id}
                          onClick={() => setSelectedSubmission(sub)}
                          className="hover:bg-primary/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-bold text-foreground group-hover:text-primary transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[11px] ${
                                isLeader
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                  : 'bg-primary/10 text-primary border border-primary/20'
                              }`}>
                                {sub.employeeName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span>{sub.employeeName}</span>
                                {isLeader && (
                                  <span className="text-[10px] text-amber-500 font-mono font-normal">
                                    ★ Team Leader
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase ${
                              isLeader
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {isLeader ? 'Team Leader' : 'Employee'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            #{sub.employeeId}
                          </td>

                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-muted border border-border font-mono text-[11px]">
                              {sub.teamName || 'Operations Team'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {isLeader ? (
                              <span className="text-amber-400 font-semibold">Manager: {sub.managerName || currentUser.name}</span>
                            ) : (
                              <span>TL: {sub.teamLeaderName || 'Team Leader'}</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                            {sub.items.length} {t('mgr.days', 'Days')}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-amber-500 whitespace-nowrap">
                            {fmtHours(sub.totalOvertimeMinutes)}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold font-mono uppercase inline-flex items-center gap-1 ${
                                sub.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : sub.status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {sub.status === 'approved' && `✓ ${t('tl.status_approved', 'Approved')} (${approvedItems}/${sub.items.length})`}
                              {sub.status === 'pending' && `⏳ ${t('tl.status_pending', 'Pending')} (${approvedItems}/${sub.items.length})`}
                              {sub.status === 'rejected' && `✕ ${t('tl.status_rejected', 'Rejected')}`}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {sub.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleManagerApproveSubmission(sub)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors shadow-2xs"
                                    title="Manager Signoff / Approve All Days"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleManagerRejectSubmission(sub)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-colors shadow-2xs"
                                    title="Manager Reject"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedSubmission(sub)}
                                className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-muted hover:bg-accent text-foreground border border-border cursor-pointer transition-all"
                              >
                                View Details →
                              </button>
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
        </>
      )}

      {/* SECTION 3: EMPLOYEE REASSIGNMENT TO TEAM LEADER */}
      {viewSection === 'reassign' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Employee Hierarchy &amp; Team Leader Reassignment Portal
                </h3>
                <p className="text-xs text-muted-foreground">
                  Managers have full authority to reassign employees between teams and change which Team Leader an employee reports to.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-mono font-bold">
              {employeesList.length} Registered Staff Employees
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-mono text-[11px] border-b border-border">
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">SAP ID</th>
                  <th className="py-3 px-4">Current Team</th>
                  <th className="py-3 px-4">Current Team Leader</th>
                  <th className="py-3 px-4">Reassign to New Team &amp; Team Leader</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employeesList.map((emp) => {
                  const empCleanSap = normalizeEmployeeId(emp.sapId);
                  const currentTeam = teams.find((t) => t.id === emp.teamId || t.memberSapIds.some((m) => normalizeEmployeeId(m) === empCleanSap));
                  const selectedTargetTeamId = reassignMap[emp.sapId] || '';

                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[11px]">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{emp.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        #{emp.sapId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-muted border border-border font-mono text-foreground font-medium">
                          {currentTeam?.name || emp.teamName || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {currentTeam?.leaderName ? (
                          <span className="text-amber-400 font-semibold">
                            {currentTeam.leaderName} (SAP #{currentTeam.leaderSapId})
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">No Team Leader</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={selectedTargetTeamId}
                          onChange={(e) =>
                            setReassignMap((prev) => ({
                              ...prev,
                              [emp.sapId]: e.target.value,
                            }))
                          }
                          className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:outline-hidden focus:border-teal-500 w-full max-w-xs"
                        >
                          <option value="">-- Choose New Team Leader &amp; Team --</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (TL: {t.leaderName || 'Unassigned'})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleExecuteReassign(emp.sapId)}
                          disabled={!selectedTargetTeamId || selectedTargetTeamId === currentTeam?.id}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                        >
                          Confirm Reassign
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drilldown Detailed Overtime Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  selectedSubmission.submitterRole === 'team_leader'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {selectedSubmission.employeeName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                    <span>{selectedSubmission.employeeName}</span>
                    <span className="text-xs font-mono font-normal text-muted-foreground">
                      (SAP #{selectedSubmission.employeeId})
                    </span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg border ${
                      selectedSubmission.submitterRole === 'team_leader'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {selectedSubmission.submitterRole === 'team_leader' ? '★ Team Leader Overtime' : 'Employee Overtime'}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Team: {selectedSubmission.teamName || 'General'} • Cycle: {selectedSubmission.periodLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/40 p-3.5 rounded-2xl border border-border text-center">
                  <div className="text-[11px] text-muted-foreground font-mono uppercase">{t('mgr.kpi_total_claimed', 'Total OT Claimed')}</div>
                  <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                    {fmtHours(selectedSubmission.totalOvertimeMinutes)}
                  </div>
                </div>
                <div className="bg-muted/40 p-3.5 rounded-2xl border border-border text-center">
                  <div className="text-[11px] text-muted-foreground font-mono uppercase">{t('mgr.col_ot_days', 'Days with Overtime')}</div>
                  <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                    {selectedSubmission.items.length} {t('mgr.days', 'Days')}
                  </div>
                </div>
                <div className="bg-muted/40 p-3.5 rounded-2xl border border-border text-center">
                  <div className="text-[11px] text-muted-foreground font-mono uppercase">{t('mgr.col_state', 'Review Status')}</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-0.5 capitalize">
                    {selectedSubmission.status}
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase font-mono text-[11px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">{t('table.col_date', 'Date')}</th>
                      <th className="py-2.5 px-3">{t('rules.shift_end_std', 'Shift Standard')}</th>
                      <th className="py-2.5 px-3">{t('tl.col_punch_shift', 'Actual Out')}</th>
                      <th className="py-2.5 px-3">{t('tl.col_authorized_ot', 'OT Claimed')}</th>
                      <th className="py-2.5 px-3">{t('tl.col_justification', 'Mandatory Justification')}</th>
                      <th className="py-2.5 px-3">Review Status</th>
                      <th className="py-2.5 px-3 text-right">Manager Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedSubmission.items.map((item) => (
                      <tr key={item.date} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                          {item.date} ({item.dayOfWeek.slice(0, 3)})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {to12Hour(item.shiftEndStandard + ':00')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {to12Hour(item.endTime)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {toHM(item.overtimeMinutes)}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs text-foreground">
                          {item.reason || <span className="text-rose-400 italic">{t('export.err_reasons', 'No reason provided')}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          {item.status === 'approved' && (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {t('tl.status_approved', 'Approved')}
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> {t('tl.status_rejected', 'Rejected')}
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="text-amber-400 font-semibold">⏳ {t('tl.status_pending', 'Pending')}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleManagerApproveItem(selectedSubmission.id, item.date)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                              title="Approve this day"
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManagerRejectItem(selectedSubmission.id, item.date)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-mono font-bold cursor-pointer"
                              title="Reject this day"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleManagerApproveSubmission(selectedSubmission)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                >
                  ✓ Approve All Days
                </button>
                <button
                  type="button"
                  onClick={() => handleManagerRejectSubmission(selectedSubmission)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                >
                  ✕ Reject File
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-mono text-xs font-semibold rounded-xl border border-border cursor-pointer"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
