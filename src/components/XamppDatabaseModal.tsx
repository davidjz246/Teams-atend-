import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Database, 
  Users, 
  Plus, 
  Trash2, 
  Download, 
  Check, 
  Copy, 
  RefreshCw, 
  FileCode2,
  ShieldCheck,
  Activity,
  Building2,
  UserCheck,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Save
} from 'lucide-react';
import { TeamInfo, UserProfile, UserRole } from '../types';
import { 
  generateXamppPhpApi, 
  generateXamppSqlSchema, 
  getTeamUsers, 
  saveTeamUsers, 
  getTeams, 
  upsertTeam, 
  upsertMultipleTeams,
  deleteTeam, 
  assignUserToTeam 
} from '../utils/teamDatabase';
import { normalizeEmployeeId, checkDuplicateEmployeeOrUser } from '../utils/employeeDirectory';
import { useLanguage } from '../i18n/LanguageContext';

interface TeamDraftItem {
  id: string;
  name: string;
  leaderSap: string;
  leaderName: string;
}

interface XamppDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserSelect?: (user: UserProfile) => void;
}

export const XamppDatabaseModal: React.FC<XamppDatabaseModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserSelect,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'teams' | 'users' | 'sql' | 'php' | 'connection'>('teams');
  const [users, setUsers] = useState<UserProfile[]>(() => getTeamUsers());
  const [teams, setTeamsList] = useState<TeamInfo[]>(() => getTeams());
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const isTeamLeaderOnly = currentUser.role === 'team_leader';
  const visibleTeams = isTeamLeaderOnly
    ? teams.filter((t) => normalizeEmployeeId(t.leaderSapId) === normalizeEmployeeId(currentUser.sapId) || t.id === currentUser.teamId)
    : teams;

  // New user form state
  const [newSapId, setNewSapId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newDept, setNewDept] = useState('Operations & Facilities');
  const [newTitle, setNewTitle] = useState('Operations Specialist');
  const [newEmail, setNewEmail] = useState('');
  const [assignedTeamIdForUser, setAssignedTeamIdForUser] = useState('');

  // Multi-Team Batch Creator state (Admin Full Authorization)
  const [newTeamDept, setNewTeamDept] = useState('Operations & Facilities');
  const [newTeamManagerSap, setNewTeamManagerSap] = useState('');
  const [newTeamManagerName, setNewTeamManagerName] = useState('');
  const [teamDraftList, setTeamDraftList] = useState<TeamDraftItem[]>([
    { id: 'draft_1', name: '', leaderSap: '', leaderName: '' },
  ]);

  // Quick member assignment state per team
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<{ [teamId: string]: string }>({});

  // XAMPP Connection tester state
  const [endpointUrl, setEndpointUrl] = useState('http://localhost/attendance/api.php');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingMessage, setPingMessage] = useState('');

  if (!isOpen || currentUser.role === 'employee') return null;

  const refreshData = () => {
    setUsers(getTeamUsers());
    setTeamsList(getTeams());
  };

  const liveUserConflict = (newSapId.trim() || newName.trim()) 
    ? checkDuplicateEmployeeOrUser(newSapId, newName) 
    : { hasConflict: false };

  const liveManagerConflict = (newTeamManagerSap.trim() || newTeamManagerName.trim())
    ? checkDuplicateEmployeeOrUser(newTeamManagerSap, newTeamManagerName)
    : { hasConflict: false };

  const getRowConflict = (item: TeamDraftItem, index: number): string | null => {
    const leaderSap = item.leaderSap.replace(/[^0-9]/g, '').trim();
    const leaderName = item.leaderName.replace(/[^a-zA-Z\s\-'.]/g, '').trim();
    const managerSap = newTeamManagerSap.replace(/[^0-9]/g, '').trim();
    const managerName = newTeamManagerName.replace(/[^a-zA-Z\s\-'.]/g, '').trim();

    if (!leaderSap && !leaderName) return null;

    if (managerSap && leaderSap && leaderSap === managerSap) {
      return 'Leader SAP matches Reporting Manager SAP';
    }
    if (managerName && leaderName && leaderName.toLowerCase() === managerName.toLowerCase()) {
      return 'Leader Name matches Reporting Manager Name';
    }

    const priorDupSap = teamDraftList.slice(0, index).some(
      (r) => r.leaderSap.replace(/[^0-9]/g, '').trim() === leaderSap && leaderSap !== ''
    );
    if (priorDupSap) {
      return `SAP #${leaderSap} is duplicated in a team row above`;
    }

    const priorDupName = teamDraftList.slice(0, index).some(
      (r) => r.leaderName.trim().toLowerCase() === leaderName.toLowerCase() && leaderName !== ''
    );
    if (priorDupName) {
      return `Leader name "${leaderName}" is duplicated in a team row above`;
    }

    const globalCheck = checkDuplicateEmployeeOrUser(leaderSap, leaderName);
    if (globalCheck.hasConflict) {
      return globalCheck.conflictMessage || 'Duplicate SAP/Name detected';
    }

    return null;
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const downloadFile = (filename: string, content: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSap = newSapId.replace(/[^0-9]/g, '');
    const cleanName = newName.replace(/[^a-zA-Z\s\-'.]/g, '').trim();

    if (!cleanSap || !cleanName) {
      alert('Valid Numeric SAP ID and Alphabetic Employee Name are required.');
      return;
    }

    // Check for duplicate SAP ID or Duplicate Name across the app
    const dupCheck = checkDuplicateEmployeeOrUser(cleanSap, cleanName);
    if (dupCheck.hasConflict) {
      alert(`⚠️ User Duplication Error:\n${dupCheck.conflictMessage}`);
      return;
    }

    const assignedTeam = teams.find((t) => t.id === assignedTeamIdForUser);

    const newUser: UserProfile = {
      id: `usr_${cleanSap}`,
      sapId: cleanSap,
      name: cleanName,
      role: newRole,
      department: newDept.trim(),
      title: newTitle.trim(),
      email: newEmail.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '.')}@wadidegla.com`,
      teamId: assignedTeam?.id,
      teamName: assignedTeam?.name,
      teamLeaderSapId: assignedTeam?.leaderSapId,
      teamLeaderName: assignedTeam?.leaderName,
      managerSapId: assignedTeam?.managerSapId,
      managerName: assignedTeam?.managerName,
    };

    const updated = [...users.filter((u) => u.sapId !== cleanSap), newUser];
    setUsers(updated);
    saveTeamUsers(updated);

    if (assignedTeam) {
      assignUserToTeam(cleanSap, assignedTeam.id);
    }

    refreshData();

    // Reset form
    setNewSapId('');
    setNewName('');
    setNewTitle('Operations Specialist');
    setNewEmail('');
    setAssignedTeamIdForUser('');
  };

  const handleDeleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (target?.role === 'admin' || target?.sapId === '9999') {
      alert('The System Administrator account cannot be deleted.');
      return;
    }
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveTeamUsers(updated);
    refreshData();
  };

  // Admin Team Batch Actions
  const handleAddTeamDraftRow = () => {
    setTeamDraftList((prev) => [
      ...prev,
      { id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, name: '', leaderSap: '', leaderName: '' },
    ]);
  };

  const handleRemoveTeamDraftRow = (id: string) => {
    if (teamDraftList.length <= 1) return;
    setTeamDraftList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateTeamDraftItem = (id: string, field: keyof TeamDraftItem, value: string) => {
    setTeamDraftList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'leaderSap' && value) {
            const clean = normalizeEmployeeId(value);
            const existingUser = users.find((u) => normalizeEmployeeId(u.sapId) === clean);
            if (existingUser && !item.leaderName) {
              updated.leaderName = existingUser.name;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleCreateTeamsBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = teamDraftList.filter((item) => item.name.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please enter at least one valid Team Name.');
      return;
    }

    const cleanDept = newTeamDept.trim() || 'Operations & Facilities';
    const cleanManagerSap = newTeamManagerSap.replace(/[^0-9]/g, '').trim();
    const cleanManagerName = newTeamManagerName.replace(/[^a-zA-Z\s\-'.]/g, '').trim();

    // Check manager uniqueness if entered
    if (cleanManagerSap || cleanManagerName) {
      if (!cleanManagerSap || !cleanManagerName) {
        alert('Please provide BOTH Manager SAP ID and Manager Name, or leave both empty.');
        return;
      }
      const managerCheck = checkDuplicateEmployeeOrUser(cleanManagerSap, cleanManagerName);
      if (managerCheck.hasConflict) {
        alert(`⚠️ Reporting Manager Duplication Error:\n${managerCheck.conflictMessage}`);
        return;
      }
    }

    // Check each team row for duplication
    const seenLeaderSaps = new Set<string>();
    const seenLeaderNames = new Set<string>();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const leaderSap = row.leaderSap.replace(/[^0-9]/g, '').trim();
      const leaderName = row.leaderName.replace(/[^a-zA-Z\s\-'.]/g, '').trim();

      if (leaderSap || leaderName) {
        if (!leaderSap || !leaderName) {
          alert(`Team "${row.name}": Please provide BOTH Leader SAP ID and Leader Name, or leave both empty.`);
          return;
        }

        // Check if leader matches manager
        if (cleanManagerSap && leaderSap === cleanManagerSap) {
          alert(`Team "${row.name}": Team Leader SAP #${leaderSap} cannot be identical to the Reporting Manager SAP ID.`);
          return;
        }
        if (cleanManagerName && leaderName.toLowerCase() === cleanManagerName.toLowerCase()) {
          alert(`Team "${row.name}": Team Leader "${leaderName}" cannot have the exact same name as the Reporting Manager.`);
          return;
        }

        // Check intra-batch duplication
        if (seenLeaderSaps.has(leaderSap)) {
          alert(`Duplication in batch: Team Leader SAP #${leaderSap} is assigned to more than one team in this submission.`);
          return;
        }
        if (seenLeaderNames.has(leaderName.toLowerCase())) {
          alert(`Duplication in batch: Team Leader name "${leaderName}" is assigned to more than one team in this submission.`);
          return;
        }

        seenLeaderSaps.add(leaderSap);
        seenLeaderNames.add(leaderName.toLowerCase());

        // Check global database / directory duplication
        const leaderCheck = checkDuplicateEmployeeOrUser(leaderSap, leaderName);
        if (leaderCheck.hasConflict) {
          alert(`⚠️ Team Leader Duplication Error for team "${row.name}":\n${leaderCheck.conflictMessage}`);
          return;
        }
      }
    }

    const teamsToCreate: TeamInfo[] = validRows.map((row, idx) => ({
      id: `team_${Date.now()}_${idx}`,
      name: row.name.trim(),
      department: cleanDept,
      leaderSapId: row.leaderSap.replace(/[^0-9]/g, '').trim(),
      leaderName: row.leaderName.replace(/[^a-zA-Z\s\-'.]/g, '').trim(),
      managerSapId: cleanManagerSap,
      managerName: cleanManagerName,
      memberSapIds: [],
    }));

    upsertMultipleTeams(teamsToCreate);
    refreshData();

    // Reset draft list to 1 fresh row, keeping department & manager for fast successive entries
    setTeamDraftList([{ id: `draft_${Date.now()}`, name: '', leaderSap: '', leaderName: '' }]);
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam(teamId);
    refreshData();
  };

  const handleAssignMemberToTeam = (teamId: string) => {
    const sapToAssign = selectedUserToAssign[teamId];
    if (!sapToAssign) return;
    assignUserToTeam(sapToAssign, teamId);
    setSelectedUserToAssign((prev) => ({ ...prev, [teamId]: '' }));
    refreshData();
  };

  const handleRemoveMemberFromTeam = (teamId: string, memberSap: string) => {
    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam) return;
    const updatedMembers = targetTeam.memberSapIds.filter((m) => normalizeEmployeeId(m) !== normalizeEmployeeId(memberSap));
    upsertTeam({
      ...targetTeam,
      memberSapIds: updatedMembers,
    });
    refreshData();
  };

  const handleTestXamppPing = async () => {
    setPingStatus('testing');
    setPingMessage('Testing connection to local XAMPP Apache / MySQL server...');
    try {
      const res = await fetch(`${endpointUrl}?action=ping`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setPingStatus('success');
        setPingMessage(`Connected successfully! Server: ${data.server || 'XAMPP'}, Database: ${data.database || 'attendance_system_db'}`);
      } else {
        setPingStatus('error');
        setPingMessage(`HTTP error ${res.status}: Ensure Apache & MySQL are running in XAMPP Control Panel and api.php is in htdocs/attendance/`);
      }
    } catch (err: any) {
      setPingStatus('error');
      setPingMessage(`Connection failed. (Note: In browser preview, local CORS might block requests to http://localhost. Run the compiled app locally or download the XAMPP files below).`);
    }
  };

  const sqlSchema = generateXamppSqlSchema();
  const phpApiCode = generateXamppPhpApi();

  const allNavTabs = [
    { id: 'teams', label: t('tabs.teams_hierarchy', 'Teams & Hierarchy'), icon: Building2 },
    { id: 'users', label: t('db.tab_roster', 'Roster & Permissions'), icon: Users },
    { id: 'sql', label: t('db.tab_sql', 'MySQL Schema (.sql)'), icon: Database },
    { id: 'php', label: t('db.tab_php', 'PHP Backend API'), icon: FileCode2 },
    { id: 'connection', label: t('db.tab_connection', 'XAMPP Server Sync'), icon: Server },
  ] as const;

  const navTabs = isTeamLeaderOnly
    ? [{ id: 'teams', label: 'My Assigned Team', icon: Building2 }] as const
    : allNavTabs;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {t('db.title', 'Database & Hierarchy Management')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  {t('db.admin_workspace', 'Admin Workspace')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('db.subtitle', 'Configure organizational teams, assign Team Leaders & Managers, maintain user roster, and sync with XAMPP MySQL.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
            title={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - Polished Segmented Control */}
        <div className="border-b border-border bg-muted/10 px-6 py-2.5 flex items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/80 w-full sm:w-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* TAB 1: TEAMS & ADMIN ASSIGNMENTS */}
          {activeTab === 'teams' && (
            <div className="space-y-5">
              
              {/* Refined Admin Authorization Banner */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider font-mono">
                      Organizational Approval Hierarchy Active
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Timesheets are submitted by employees to their designated <strong className="text-foreground font-semibold">Team Leader</strong> for review. Once verified, Team Leaders route authorized claims to the <strong className="text-foreground font-semibold">Reporting Manager</strong> for final payroll approval.
                  </p>
                </div>
              </div>

              {isTeamLeaderOnly ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Team Leader Restricted View (Read-Only)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      You are viewing your designated team. Team creation, deletion, and cross-team employee reassignment are strictly managed by Reporting Managers and System Administrators.
                    </p>
                  </div>
                </div>
              ) : (
                /* Create New Team Form (Multi-Team & Single Manager Batch Support) */
                <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs relative">
                {/* Sticky Section Header */}
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md -mx-5 px-5 pt-1 pb-3.5 border-b border-border flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                          Department &amp; Multi-Team Hierarchy Builder
                        </h4>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25">
                          {teamDraftList.length} {teamDraftList.length === 1 ? 'Team' : 'Teams'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Define department &amp; reporting manager once, then add one or multiple teams reporting to this manager.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddTeamDraftRow}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs font-mono cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Another Team</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCreateTeamsBatch} className="space-y-4 text-xs">
                  {/* Step 1: Department & Reporting Manager (Shared for all teams in this batch) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 rounded-xl bg-muted/20 border border-border">
                    {/* Department */}
                    <div className="lg:col-span-4 space-y-1.5">
                      <label className="block text-muted-foreground font-medium text-[11px]">
                        Department <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTeamDept}
                        onChange={(e) => setNewTeamDept(e.target.value)}
                        placeholder="e.g. IT & Digital Systems"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-amber-500 transition-colors"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Applied across all teams created in this batch.
                      </p>
                    </div>

                    {/* Reporting Manager (Director) */}
                    <div className="lg:col-span-8 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-400 font-mono uppercase flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Department Reporting Manager (Director)</span>
                        </span>
                        <span className="text-[10px] text-indigo-400/80 font-mono">
                          Auto-Role: manager
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={newTeamManagerSap}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setNewTeamManagerSap(val);
                            if (val) {
                              const existingUser = users.find((u) => normalizeEmployeeId(u.sapId) === normalizeEmployeeId(val));
                              if (existingUser && !newTeamManagerName) {
                                setNewTeamManagerName(existingUser.name);
                              }
                            }
                          }}
                          placeholder="SAP"
                          className="col-span-2 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs focus:outline-hidden focus:border-indigo-400"
                        />
                        <input
                          type="text"
                          value={newTeamManagerName}
                          onChange={(e) => setNewTeamManagerName(e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                          placeholder="name"
                          className="col-span-3 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-indigo-400"
                        />
                      </div>
                      {liveManagerConflict.hasConflict && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>{liveManagerConflict.conflictMessage}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        All teams below will report directly to this Manager. System registers/updates their role to <strong className="text-indigo-400">Manager</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Teams & Team Leaders Roster */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-foreground font-mono uppercase flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>Teams &amp; Designated Team Leaders ({teamDraftList.length})</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Add as many teams as needed for this manager
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {teamDraftList.map((item, index) => {
                        const rowConflict = getRowConflict(item, index);
                        return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-border/50">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center text-[10px] font-mono font-bold">
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {item.name || `Team #${index + 1}`}
                              </span>
                            </div>
                            {teamDraftList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamDraftRow(item.id)}
                                className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                title="Remove team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            {/* Team Name */}
                            <div className="sm:col-span-5 space-y-1">
                              <label className="block text-muted-foreground font-medium text-[10px]">
                                Team Name <span className="text-amber-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateTeamDraftItem(item.id, 'name', e.target.value)}
                                placeholder="e.g. IT & Digital Systems"
                                required
                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                              />
                            </div>

                            {/* Team Leader */}
                            <div className="sm:col-span-7 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block text-muted-foreground font-medium text-[10px] flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-amber-500" />
                                  <span>Assigned Team Leader</span>
                                </label>
                                <span className="text-[9px] text-amber-500 font-mono">
                                  Auto-Role: team_leader
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={item.leaderSap}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    handleUpdateTeamDraftItem(item.id, 'leaderSap', val);
                                  }}
                                  placeholder="SAP"
                                  className="col-span-2 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs focus:outline-hidden focus:border-amber-500"
                                />
                                <input
                                  type="text"
                                  value={item.leaderName}
                                  onChange={(e) => handleUpdateTeamDraftItem(item.id, 'leaderName', e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                                  placeholder="name"
                                  className="col-span-3 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                              {rowConflict && (
                                <div className="mt-1.5 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] flex items-center gap-1.5">
                                  <Info className="w-3 h-3 shrink-0" />
                                  <span>{rowConflict}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Submit & Add Row Actions (Sticky Bottom Bar) */}
                  <div className="sticky bottom-0 z-20 bg-card/95 backdrop-blur-md -mx-5 px-5 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-b-xl shadow-lg">
                    <button
                      type="button"
                      onClick={handleAddTeamDraftRow}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-500" />
                      <span>+ Add Another Team under this Manager</span>
                    </button>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        Save All Teams ({teamDraftList.filter((r) => r.name.trim().length > 0).length || 1}) &amp; Assign Leaders
                      </span>
                    </button>
                  </div>
                </form>
              </div>
              )}

              {/* Teams Cards Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      {isTeamLeaderOnly ? 'Your Assigned Team' : `Configured Teams & Assignments (${teams.length})`}
                    </h4>
                  </div>
                </div>

                {visibleTeams.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-2">
                    <Building2 className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                    <h5 className="text-sm font-bold text-foreground">No Teams Found</h5>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      {isTeamLeaderOnly
                        ? 'No team is currently assigned to your Team Leader profile.'
                        : 'Use the form above to define your organizational teams, assign Team Leaders and Reporting Managers, and allocate employee rosters.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleTeams.map((team) => {
                      return (
                        <div
                          key={team.id}
                          className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xs flex flex-col justify-between hover:border-border/80 transition-all"
                        >
                          {/* Team Title */}
                          <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-foreground text-sm">
                                  {team.name}
                                </h5>
                                <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono font-medium">
                                  {team.memberSapIds.length} {team.memberSapIds.length === 1 ? 'member' : 'members'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {team.department || 'General'}
                              </p>
                            </div>

                            {!isTeamLeaderOnly && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(team.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                title="Delete Team"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Leader & Manager Info Badges */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                              <span className="text-[10px] text-amber-500 uppercase font-bold font-mono block">
                                Team Leader (TL)
                              </span>
                              <div className="font-bold text-foreground truncate">
                                {team.leaderName || 'Unassigned'}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {team.leaderSapId ? `SAP #${team.leaderSapId}` : 'No SAP ID'}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-0.5">
                              <span className="text-[10px] text-indigo-400 uppercase font-bold font-mono block">
                                Reporting Manager
                              </span>
                              <div className="font-bold text-foreground truncate">
                                {team.managerName || 'Unassigned'}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {team.managerSapId ? `SAP #${team.managerSapId}` : 'No SAP ID'}
                              </div>
                            </div>
                          </div>

                        {/* Member Roster */}
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                            <span>Assigned Employees</span>
                          </div>

                          {team.memberSapIds.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                              No employees assigned yet.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                              {team.memberSapIds.map((mSap) => {
                                const memberUser = users.find((u) => normalizeEmployeeId(u.sapId) === normalizeEmployeeId(mSap));
                                return (
                                  <span
                                    key={mSap}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-xs"
                                  >
                                    <span className="font-mono font-bold text-foreground">#{mSap}</span>
                                    <span className="text-muted-foreground truncate max-w-[100px]">
                                      {memberUser?.name || 'Employee'}
                                    </span>
                                    {!isTeamLeaderOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMemberFromTeam(team.id, mSap)}
                                        className="text-muted-foreground hover:text-rose-400 cursor-pointer ml-0.5 p-0.5"
                                        title="Remove from team"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Assign Dropdown (Restricted to Managers/Admins Only) */}
                          {!isTeamLeaderOnly && (
                            <div className="flex items-center gap-2 pt-1">
                              {(() => {
                                const eligibleEmployees = users.filter(
                                  (u) =>
                                    u.role === 'employee' &&
                                    !team.memberSapIds.includes(u.sapId) &&
                                    normalizeEmployeeId(u.sapId) !== normalizeEmployeeId(team.leaderSapId) &&
                                    normalizeEmployeeId(u.sapId) !== normalizeEmployeeId(team.managerSapId)
                                );

                                return (
                                  <>
                                    <select
                                      value={selectedUserToAssign[team.id] || ''}
                                      onChange={(e) =>
                                        setSelectedUserToAssign((prev) => ({
                                          ...prev,
                                          [team.id]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-hidden focus:border-amber-500"
                                    >
                                      <option value="">
                                        {eligibleEmployees.length > 0
                                          ? '+ Assign Employee to this Team Leader...'
                                          : 'No available employees (Role: Employee)'}
                                      </option>
                                      {eligibleEmployees.map((u) => (
                                        <option key={u.id} value={u.sapId}>
                                          #{u.sapId} - {u.name} (Employee)
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignMemberToTeam(team.id)}
                                      disabled={!selectedUserToAssign[team.id]}
                                      className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-bold rounded-xl cursor-pointer shadow-2xs whitespace-nowrap transition-colors"
                                    >
                                      Assign
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

          {/* TAB 2: USERS & ROLES */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Add New User Form */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
                      Register System User / Assign Role
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Create employee or leadership credentials with assigned team associations.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      SAP ID # <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newSapId}
                      onChange={(e) => setNewSapId(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="SAP"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      Full Name <span className="text-amber-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                      placeholder="name"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      Role Permission <span className="text-amber-500">*</span>
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="employee">Employee (Timesheet Only)</option>
                      <option value="team_leader">Team Leader (Approvals for Assigned Team)</option>
                      <option value="manager">Manager (Executive Overview &amp; Master Matrix)</option>
                      <option value="admin">Administrator (Full Authorization)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      Assign to Team
                    </label>
                    <select
                      value={assignedTeamIdForUser}
                      onChange={(e) => setAssignedTeamIdForUser(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="">Unassigned</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (TL: {t.leaderName || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      Department
                    </label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder="e.g. Operations & Facilities"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={liveUserConflict.hasConflict}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5 ${
                        liveUserConflict.hasConflict
                          ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                          : 'bg-amber-500 hover:bg-amber-400 text-black'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Save to Roster</span>
                    </button>
                  </div>
                </form>

                {liveUserConflict.hasConflict && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{liveUserConflict.conflictMessage}</span>
                  </div>
                )}
              </div>

              {/* Users Roster Table */}
              <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-xs">
                <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-foreground">Registered System Accounts ({users.length})</span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Synced with Local &amp; XAMPP MySQL</span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                      <tr>
                        <th className="py-3 px-4">SAP ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Role Permission</th>
                        <th className="py-3 px-4">Assigned Team &amp; Leader</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((u) => {
                        const isCurrent = currentUser.id === u.id || currentUser.sapId === u.sapId;
                        const userTeam = teams.find((t) => t.id === u.teamId || t.memberSapIds.includes(u.sapId));

                        return (
                          <tr key={u.id} className={isCurrent ? 'bg-amber-500/5' : 'hover:bg-muted/25 transition-colors'}>
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              #{u.sapId}
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {u.name}
                              {isCurrent && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-500 border border-amber-500/30 font-mono">
                                  Current User
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    : u.role === 'manager'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : u.role === 'team_leader'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">
                              {userTeam ? (
                                <span>
                                  <strong className="text-foreground">{userTeam.name}</strong> • <span className="text-amber-400">TL: {userTeam.leaderName || 'N/A'}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onUserSelect && (
                                  <button
                                    type="button"
                                    onClick={() => onUserSelect(u)}
                                    className="px-2.5 py-1 rounded-lg text-xs bg-secondary hover:bg-secondary/80 text-foreground border border-border cursor-pointer font-medium transition-colors"
                                  >
                                    Switch User
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          )}

          {/* TAB 3: MYSQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-foreground">
                    MySQL Schema Script (attendance_system_db.sql)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Import this into phpMyAdmin or MySQL Workbench on your XAMPP server.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sqlSchema, 'sql')}
                    className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedSection === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'sql' ? 'Copied' : 'Copy SQL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFile('attendance_system_db.sql', sqlSchema)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-muted/40 border border-border rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 text-foreground custom-scrollbar">
                  {sqlSchema}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: PHP BACKEND API */}
          {activeTab === 'php' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase text-foreground">
                    PHP Backend API (api.php)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Place this file in <code className="text-amber-400 font-mono font-bold">xampp/htdocs/attendance/api.php</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(phpApiCode, 'php')}
                    className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedSection === 'php' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'php' ? 'Copied' : 'Copy PHP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFile('api.php', phpApiCode, 'application/x-php')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download api.php</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="p-4 bg-muted/40 border border-border rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 text-foreground custom-scrollbar">
                  {phpApiCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: XAMPP SERVER SYNC */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="bg-card border border-border p-5 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase text-foreground">
                      XAMPP Local Server Connection Diagnostics
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Verify network connectivity between this interface and your local MySQL database.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-muted-foreground font-medium mb-1 text-[11px]">
                      PHP API Endpoint URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground font-mono focus:outline-hidden focus:border-amber-500 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleTestXamppPing}
                        disabled={pingStatus === 'testing'}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                        <span>Ping Server</span>
                      </button>
                    </div>
                  </div>

                  {pingStatus !== 'idle' && (
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3 ${
                        pingStatus === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : pingStatus === 'error'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          {pingStatus === 'success'
                            ? 'Connection Successful'
                            : pingStatus === 'error'
                            ? 'Connection Notice'
                            : 'Connecting...'}
                        </span>
                        <p className="text-xs mt-0.5 leading-relaxed">{pingMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions steps */}
              <div className="bg-card border border-border p-5 rounded-2xl space-y-3 text-xs shadow-xs">
                <h5 className="font-bold text-foreground font-mono uppercase text-xs">
                  3-Step Local Setup Guide
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 font-bold font-mono text-[11px] flex items-center justify-center mb-1">
                      1
                    </span>
                    <h6 className="font-semibold text-foreground text-xs">Start Services</h6>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Start <strong className="text-foreground">Apache</strong> and <strong className="text-foreground">MySQL</strong> in XAMPP Control Panel.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 font-bold font-mono text-[11px] flex items-center justify-center mb-1">
                      2
                    </span>
                    <h6 className="font-semibold text-foreground text-xs">Import Database</h6>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Open <code className="text-amber-400">phpMyAdmin</code> and import the SQL schema from Tab 3.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 font-bold font-mono text-[11px] flex items-center justify-center mb-1">
                      3
                    </span>
                    <h6 className="font-semibold text-foreground text-xs">Deploy API Script</h6>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Save <code className="text-amber-400">api.php</code> inside <code className="text-foreground">htdocs/attendance/</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
