import { ApprovalStatus, OvertimeSubmission, TeamInfo, UserProfile, UserRole } from '../types';
import { normalizeEmployeeId } from './employeeDirectory';

export const DEFAULT_TEAMS: TeamInfo[] = [];

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'usr_admin',
    sapId: '9999',
    name: 'Admin',
    role: 'admin',
    email: 'admin@wadidegla.com',
    department: 'Management Information Systems',
    title: 'System Administrator',
  },
];

const STORAGE_KEY_TEAMS = 'wdc_teams_structure_v8';
const STORAGE_KEY_USERS = 'wdc_team_users_v8';
const STORAGE_KEY_ACTIVE_USER = 'wdc_active_user_id_v8';
const STORAGE_KEY_SUBMISSIONS = 'wdc_team_submissions_v8';
const LEGACY_STORAGE_KEYS = [
  'wdc_teams_structure_v5',
  'wdc_teams_structure_v6',
  'wdc_teams_structure_v7',
  'wdc_team_users',
  'wdc_team_users_v2',
  'wdc_team_users_v3',
  'wdc_team_users_v4',
  'wdc_team_users_v5',
  'wdc_team_users_v6',
  'wdc_team_users_v7',
  'wdc_active_user_id',
  'wdc_active_user_id_v2',
  'wdc_active_user_id_v3',
  'wdc_active_user_id_v4',
  'wdc_active_user_id_v5',
  'wdc_active_user_id_v6',
  'wdc_active_user_id_v7',
  'wdc_team_submissions',
  'wdc_team_submissions_v2',
  'wdc_team_submissions_v3',
  'wdc_team_submissions_v4',
  'wdc_team_submissions_v5',
  'wdc_team_submissions_v6',
  'wdc_team_submissions_v7',
];

export const INITIAL_SUBMISSIONS: OvertimeSubmission[] = [];

/**
 * Retrieves all organized teams
 */
export function getTeams(): TeamInfo[] {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(DEFAULT_TEAMS));
  } catch (e) {
    console.error('Failed to load teams', e);
  }
  return DEFAULT_TEAMS;
}

/**
 * Saves team structure
 */
export function saveTeams(teams: TeamInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
    window.dispatchEvent(new CustomEvent('teams_updated', { detail: teams }));
  } catch (e) {
    console.error('Failed to save teams', e);
  }
}

/**
 * Creates or updates a team (Admin authorization)
 * Automatically provisions or updates Team Leader and Reporting Manager accounts
 * in the system roster with their respective roles ('team_leader' and 'manager').
 */
export function upsertTeam(team: TeamInfo): void {
  upsertMultipleTeams([team]);
}

/**
 * Creates or updates multiple teams at once (Batch creation under a department/manager)
 */
export function upsertMultipleTeams(teamsToAdd: TeamInfo[]): void {
  if (!teamsToAdd.length) return;
  const current = getTeams();
  let nextTeams = [...current];

  for (const team of teamsToAdd) {
    const index = nextTeams.findIndex((t) => t.id === team.id);
    if (index >= 0) {
      nextTeams[index] = team;
    } else {
      nextTeams.push(team);
    }
  }
  saveTeams(nextTeams);

  // Auto-sync / auto-create Leaders and Managers in the user roster
  const users = getTeamUsers();
  let updatedUsers = [...users];

  for (const team of teamsToAdd) {
    const cleanLeaderSap = normalizeEmployeeId(team.leaderSapId);
    const cleanManagerSap = normalizeEmployeeId(team.managerSapId);

    // 1. Auto-provision or update Team Leader (Reports to Manager, NOT to self!)
    if (cleanLeaderSap) {
      const leaderIdx = updatedUsers.findIndex((u) => normalizeEmployeeId(u.sapId) === cleanLeaderSap);
      const leaderName = team.leaderName?.trim() || `Team Leader (${cleanLeaderSap})`;
      if (leaderIdx >= 0) {
        const existing = updatedUsers[leaderIdx];
        updatedUsers[leaderIdx] = {
          ...existing,
          name: team.leaderName?.trim() || existing.name,
          role: existing.role === 'admin' ? 'admin' : 'team_leader',
          title: existing.title === 'Operations Specialist' || !existing.title ? 'Team Leader' : existing.title,
          department: team.department || existing.department || 'Operations & Facilities',
          teamId: team.id,
          teamName: team.name,
          teamLeaderSapId: undefined, // Team leader does not report to self!
          teamLeaderName: undefined,
          managerSapId: team.managerSapId, // Team leader reports to manager
          managerName: team.managerName,
        };
      } else {
        updatedUsers.push({
          id: `usr_tl_${cleanLeaderSap}`,
          sapId: cleanLeaderSap,
          name: leaderName,
          role: 'team_leader',
          email: `${leaderName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@wadidegla.com`,
          department: team.department || 'Operations & Facilities',
          title: 'Team Leader',
          teamId: team.id,
          teamName: team.name,
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
          managerSapId: team.managerSapId,
          managerName: team.managerName,
        });
      }
    }

    // 2. Auto-provision or update Reporting Manager
    if (cleanManagerSap) {
      const managerIdx = updatedUsers.findIndex((u) => normalizeEmployeeId(u.sapId) === cleanManagerSap);
      const managerName = team.managerName?.trim() || `Reporting Manager (${cleanManagerSap})`;
      if (managerIdx >= 0) {
        const existing = updatedUsers[managerIdx];
        updatedUsers[managerIdx] = {
          ...existing,
          name: team.managerName?.trim() || existing.name,
          role: existing.role === 'admin' ? 'admin' : 'manager',
          title: existing.title === 'Operations Specialist' || !existing.title ? 'Operations Director' : existing.title,
          department: team.department || existing.department || 'Operations & Facilities',
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
        };
      } else {
        updatedUsers.push({
          id: `usr_mgr_${cleanManagerSap}`,
          sapId: cleanManagerSap,
          name: managerName,
          role: 'manager',
          email: `${managerName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@wadidegla.com`,
          department: team.department || 'Operations & Facilities',
          title: 'Operations Director',
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
        });
      }
    }

    // 3. Update team attributes for all members assigned to this team
    updatedUsers = updatedUsers.map((u) => {
      const uClean = normalizeEmployeeId(u.sapId);
      if (uClean === cleanLeaderSap) {
        return {
          ...u,
          teamId: team.id,
          teamName: team.name,
          role: u.role === 'admin' ? 'admin' : 'team_leader',
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
          managerSapId: team.managerSapId,
          managerName: team.managerName,
        };
      }
      if (uClean === cleanManagerSap) {
        return {
          ...u,
          role: u.role === 'admin' ? 'admin' : 'manager',
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
        };
      }
      if (u.teamId === team.id || team.memberSapIds?.some((m) => normalizeEmployeeId(m) === uClean)) {
        return {
          ...u,
          teamId: team.id,
          teamName: team.name,
          teamLeaderSapId: team.leaderSapId,
          teamLeaderName: team.leaderName,
          managerSapId: team.managerSapId,
          managerName: team.managerName,
        };
      }
      return u;
    });
  }

  saveTeamUsers(updatedUsers);
}

/**
 * Deletes a team (Admin authorization)
 */
export function deleteTeam(teamId: string): void {
  const current = getTeams();
  const nextTeams = current.filter((t) => t.id !== teamId);
  saveTeams(nextTeams);
}

/**
 * Assigns an employee or team leader to a team (Admin / Manager authorization)
 */
export function assignUserToTeam(sapId: string, targetTeamId: string): void {
  const cleanSap = normalizeEmployeeId(sapId);
  if (!cleanSap) return;

  const currentTeams = getTeams();
  const updatedTeams = currentTeams.map((team) => {
    // Remove from other teams
    const withoutMember = team.memberSapIds.filter((m) => normalizeEmployeeId(m) !== cleanSap);
    if (team.id === targetTeamId) {
      return {
        ...team,
        memberSapIds: Array.from(new Set([...withoutMember, cleanSap])),
      };
    }
    return {
      ...team,
      memberSapIds: withoutMember,
    };
  });
  saveTeams(updatedTeams);

  // Update user record if present
  const users = getTeamUsers();
  const targetTeam = updatedTeams.find((t) => t.id === targetTeamId);
  const updatedUsers = users.map((u) => {
    if (normalizeEmployeeId(u.sapId) === cleanSap) {
      const isLeader = targetTeam && normalizeEmployeeId(targetTeam.leaderSapId) === cleanSap;
      if (isLeader) {
        return {
          ...u,
          role: (u.role === 'admin' ? 'admin' : 'team_leader') as UserRole,
          teamId: targetTeam?.id,
          teamName: targetTeam?.name,
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
          managerSapId: targetTeam?.managerSapId,
          managerName: targetTeam?.managerName,
        };
      }
      return {
        ...u,
        teamId: targetTeam?.id,
        teamName: targetTeam?.name,
        teamLeaderSapId: targetTeam?.leaderSapId,
        teamLeaderName: targetTeam?.leaderName,
        managerSapId: targetTeam?.managerSapId,
        managerName: targetTeam?.managerName,
      };
    }
    return u;
  });
  saveTeamUsers(updatedUsers);
}

/**
 * Reassigns an employee to a new team & team leader (Manager & Admin authorization)
 */
export function reassignEmployeeToTeam(employeeSapId: string, newTeamId: string): boolean {
  const cleanSap = normalizeEmployeeId(employeeSapId);
  if (!cleanSap || !newTeamId) return false;
  assignUserToTeam(cleanSap, newTeamId);
  return true;
}

/**
 * Assigns a Team Leader to a team (Admin authorization)
 */
export function assignTeamLeader(teamId: string, leaderSapId: string, leaderName: string): void {
  const cleanLeaderSap = normalizeEmployeeId(leaderSapId);
  const teams = getTeams();
  const updatedTeams = teams.map((team) => {
    if (team.id === teamId) {
      return {
        ...team,
        leaderSapId: cleanLeaderSap,
        leaderName: leaderName.trim(),
      };
    }
    return team;
  });
  saveTeams(updatedTeams);

  // Also update users in this team
  const targetTeam = updatedTeams.find((t) => t.id === teamId);
  if (targetTeam) {
    const users = getTeamUsers();
    const updatedUsers = users.map((u) => {
      if (normalizeEmployeeId(u.sapId) === cleanLeaderSap) {
        return {
          ...u,
          role: 'team_leader' as UserRole,
          teamId: targetTeam.id,
          teamName: targetTeam.name,
          teamLeaderSapId: undefined,
          teamLeaderName: undefined,
          managerSapId: targetTeam.managerSapId,
          managerName: targetTeam.managerName,
        };
      }
      if (u.teamId === teamId && normalizeEmployeeId(u.sapId) !== cleanLeaderSap) {
        return {
          ...u,
          teamLeaderSapId: targetTeam.leaderSapId,
          teamLeaderName: targetTeam.leaderName,
          managerSapId: targetTeam.managerSapId,
          managerName: targetTeam.managerName,
        };
      }
      return u;
    });
    saveTeamUsers(updatedUsers);
  }
}

/**
 * Assigns a Manager to a team (Admin authorization)
 */
export function assignTeamManager(teamId: string, managerSapId: string, managerName: string): void {
  const cleanManagerSap = normalizeEmployeeId(managerSapId);
  const teams = getTeams();
  const updatedTeams = teams.map((team) => {
    if (team.id === teamId) {
      return {
        ...team,
        managerSapId: cleanManagerSap,
        managerName: managerName.trim(),
      };
    }
    return team;
  });
  saveTeams(updatedTeams);

  // Update user profiles in this team with the new manager
  const users = getTeamUsers();
  const updatedUsers = users.map((u) => {
    if (u.teamId === teamId) {
      return {
        ...u,
        managerSapId: cleanManagerSap,
        managerName: managerName.trim(),
      };
    }
    if (normalizeEmployeeId(u.sapId) === cleanManagerSap) {
      return {
        ...u,
        role: 'manager' as UserRole,
        teamLeaderSapId: undefined,
        teamLeaderName: undefined,
      };
    }
    return u;
  });
  saveTeamUsers(updatedUsers);
}

/**
 * Finds team by Team ID
 */
export function getTeamById(teamId: string): TeamInfo | undefined {
  const teams = getTeams();
  return teams.find((t) => t.id === teamId);
}

/**
 * Finds team for an employee or leader SAP ID
 */
export function getTeamForSapId(sapId: string): TeamInfo | undefined {
  const cleanId = normalizeEmployeeId(sapId);
  if (!cleanId) return undefined;

  const teams = getTeams();
  // 1. Is leader of a team?
  const asLeader = teams.find((t) => normalizeEmployeeId(t.leaderSapId) === cleanId);
  if (asLeader) return asLeader;

  // 2. Is member of a team?
  const asMember = teams.find((t) => t.memberSapIds.some((m) => normalizeEmployeeId(m) === cleanId));
  if (asMember) return asMember;

  return undefined;
}

export function getTeamUsers(): UserProfile[] {
  try {
    // Clear previous storage keys with old demo profiles
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure at least one Admin profile exists and any user named 'admin' is properly typed as role 'admin'
        let hasAdmin = false;
        const normalizedList: UserProfile[] = parsed.map((u: UserProfile) => {
          if (u.role === 'admin') {
            hasAdmin = true;
            return u;
          }
          if (u.name?.toLowerCase() === 'admin' || u.sapId === '9999') {
            hasAdmin = true;
            return {
              ...u,
              role: 'admin' as UserRole,
              title: u.title || 'System Administrator',
            };
          }
          return u;
        });

        if (!hasAdmin) {
          normalizedList.unshift(DEFAULT_USERS[0]);
        }
        return normalizedList;
      }
    }
  } catch (e) {
    console.error('Failed to load team users from storage', e);
  }
  return DEFAULT_USERS;
}

export function saveTeamUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('team_users_updated', { detail: users }));
  } catch (e) {
    console.error('Failed to save team users', e);
  }
}

export function getActiveUser(): UserProfile {
  const users = getTeamUsers();
  try {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
    if (activeId) {
      const found = users.find((u) => u.id === activeId || u.sapId === activeId);
      if (found) return found;
    }
  } catch (e) {
    console.error(e);
  }
  // Default to first user
  return users[0] || DEFAULT_USERS[0];
}

export function setActiveUser(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, user.id);
    window.dispatchEvent(new CustomEvent('active_user_changed', { detail: user }));
  } catch (e) {
    console.error(e);
  }
}

export function getSubmissions(): OvertimeSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  } catch (e) {
    console.error('Failed to load submissions from storage', e);
  }
  return INITIAL_SUBMISSIONS;
}

/**
 * Access Control: Filters submissions so that:
 * 1. Employees can only access data within their assigned team / own submissions.
 * 2. Team Leaders can only access submissions from their own team members.
 * 3. Managers / Admins can access all teams and all members.
 */
export function filterSubmissionsForUser(
  submissions: OvertimeSubmission[],
  user: UserProfile,
  scope: 'all' | 'review' = 'all'
): OvertimeSubmission[] {
  if (!user) return [];

  // Managers and Admins can view all submissions across all teams
  if (user.role === 'manager' || user.role === 'admin') {
    return submissions;
  }

  const userCleanSap = normalizeEmployeeId(user.sapId);
  const userTeam = getTeamForSapId(userCleanSap) || (user.teamId ? getTeamById(user.teamId) : undefined);

  // Team Leader: Can ONLY view submissions from their team
  if (user.role === 'team_leader') {
    return submissions.filter((sub) => {
      const subCleanSap = normalizeEmployeeId(sub.employeeId);
      const subTeamId = sub.teamId;
      const subLeaderSap = normalizeEmployeeId(sub.teamLeaderSapId || '');

      // In review mode for approvals, exclude TL's own file so they don't self-approve (manager must approve TL)
      if (scope === 'review' && subCleanSap === userCleanSap) {
        return false;
      }

      // If viewing all, TL can see their own file status as well
      if (scope === 'all' && subCleanSap === userCleanSap) {
        return true;
      }

      // Direct match if assigned to this leader
      if (subLeaderSap && subLeaderSap === userCleanSap) return true;

      // Match by team ID
      if (userTeam && subTeamId && subTeamId === userTeam.id) return true;

      // Match by member list in team
      if (userTeam && userTeam.memberSapIds.some((m) => normalizeEmployeeId(m) === subCleanSap)) return true;

      return false;
    });
  }

  // Employee: Can ONLY view their own submissions within their team (strictly isolated from other teams)
  return submissions.filter((sub) => {
    const subCleanSap = normalizeEmployeeId(sub.employeeId);
    if (subCleanSap === userCleanSap) return true;
    if (sub.employeeName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    return false;
  });
}

export function saveSubmission(submission: OvertimeSubmission): void {
  try {
    // Ensure numeric SAP ID
    submission.employeeId = normalizeEmployeeId(submission.employeeId);

    // Auto-attach team and management hierarchy details
    const team = getTeamForSapId(submission.employeeId) || (submission.teamId ? getTeamById(submission.teamId) : undefined);
    if (team) {
      submission.teamId = team.id;
      submission.teamName = team.name;
      if (!submission.department) {
        submission.department = team.department || 'Operations & Facilities';
      }
      submission.managerSapId = team.managerSapId;
      submission.managerName = team.managerName;

      const isLeader = normalizeEmployeeId(team.leaderSapId) === submission.employeeId;
      if (isLeader || submission.submitterRole === 'team_leader') {
        submission.submitterRole = 'team_leader';
        submission.teamLeaderSapId = undefined; // TL reports to Manager, not to self
        submission.teamLeaderName = undefined;
      } else {
        submission.submitterRole = 'employee';
        submission.teamLeaderSapId = team.leaderSapId;
        submission.teamLeaderName = team.leaderName;
      }
    }

    // Ensure totals are accurate
    submission.totalOvertimeMinutes = submission.items.reduce((sum, i) => sum + (i.overtimeMinutes || 0), 0);
    submission.originalTotalOvertimeMinutes = submission.items.reduce(
      (sum, i) => sum + (i.originalOvertimeMinutes ?? i.overtimeMinutes ?? 0),
      0
    );

    const existing = getSubmissions();
    const idx = existing.findIndex((s) => s.id === submission.id);
    let updated: OvertimeSubmission[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = submission;
    } else {
      updated = [submission, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('team_submissions_updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save submission', e);
  }
}

/**
 * Allows Team Leader to edit/correct the overtime minutes for an individual day
 * (e.g. employee was not actually on overtime or added unverified hours).
 */
export function updateItemOvertimeAdjustment(
  submissionId: string,
  date: string,
  newOvertimeMinutes: number,
  adjustedReason: string = '',
  approveAfterAdjust: boolean = false,
  leaderName: string = 'Team Leader'
): void {
  const submissions = getSubmissions();
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return;

  const item = sub.items.find((i) => i.date === date);
  if (!item) return;

  // Preserve original claim if this is the first adjustment
  if (item.originalOvertimeMinutes === undefined) {
    item.originalOvertimeMinutes = item.overtimeMinutes;
  }

  const validMinutes = Math.max(0, Math.round(newOvertimeMinutes));
  item.overtimeMinutes = validMinutes;
  item.isAdjustedByLeader = true;
  item.adjustedReason = adjustedReason.trim();

  if (approveAfterAdjust) {
    item.status = 'approved';
    item.decidedAt = new Date().toISOString();
    item.decidedBy = leaderName;
    item.leaderNotes = adjustedReason.trim()
      ? `Adjusted to ${Math.floor(validMinutes / 60)}h ${validMinutes % 60}m: ${adjustedReason.trim()}`
      : `Approved with adjusted duration (${Math.floor(validMinutes / 60)}h ${validMinutes % 60}m)`;
  }

  // Recalculate submission totals
  sub.totalOvertimeMinutes = sub.items.reduce((acc, i) => acc + (i.overtimeMinutes || 0), 0);
  sub.originalTotalOvertimeMinutes = sub.items.reduce(
    (acc, i) => acc + (i.originalOvertimeMinutes ?? i.overtimeMinutes ?? 0),
    0
  );

  // Update submission overall review metadata if approved
  if (approveAfterAdjust) {
    const allApproved = sub.items.every((i) => i.status === 'approved');
    const allRejected = sub.items.every((i) => i.status === 'rejected');
    const anyPending = sub.items.some((i) => i.status === 'pending');

    if (allApproved) {
      sub.status = 'approved';
    } else if (allRejected) {
      sub.status = 'rejected';
    } else if (anyPending) {
      sub.status = 'pending';
    } else {
      sub.status = 'approved';
    }

    sub.reviewedBy = leaderName;
    sub.reviewedAt = new Date().toISOString();
  }

  saveSubmission(sub);
}

/**
 * Reverts an item's overtime back to the original employee claimed duration
 */
export function resetItemOvertimeAdjustment(submissionId: string, date: string): void {
  const submissions = getSubmissions();
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return;

  const item = sub.items.find((i) => i.date === date);
  if (!item) return;

  if (item.originalOvertimeMinutes !== undefined) {
    item.overtimeMinutes = item.originalOvertimeMinutes;
  }
  item.isAdjustedByLeader = false;
  item.adjustedReason = undefined;

  // Recalculate submission totals
  sub.totalOvertimeMinutes = sub.items.reduce((acc, i) => acc + (i.overtimeMinutes || 0), 0);
  sub.originalTotalOvertimeMinutes = sub.items.reduce(
    (acc, i) => acc + (i.originalOvertimeMinutes ?? i.overtimeMinutes ?? 0),
    0
  );

  saveSubmission(sub);
}

export function updateItemApproval(
  submissionId: string,
  date: string,
  status: ApprovalStatus,
  leaderNotes: string = '',
  leaderName: string = 'Team Leader'
): void {
  const submissions = getSubmissions();
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return;

  const item = sub.items.find((i) => i.date === date);
  if (item) {
    item.status = status;
    item.leaderNotes = leaderNotes;
    item.decidedAt = new Date().toISOString();
    item.decidedBy = leaderName;
  }

  // Update overall submission status
  const allApproved = sub.items.every((i) => i.status === 'approved');
  const allRejected = sub.items.every((i) => i.status === 'rejected');
  const anyPending = sub.items.some((i) => i.status === 'pending');

  if (allApproved) {
    sub.status = 'approved';
  } else if (allRejected) {
    sub.status = 'rejected';
  } else if (anyPending) {
    sub.status = 'pending';
  } else {
    sub.status = 'approved'; // Partially approved
  }

  sub.reviewedBy = leaderName;
  sub.reviewedAt = new Date().toISOString();

  saveSubmission(sub);
}

export function deleteSubmission(submissionId: string): void {
  try {
    const existing = getSubmissions();
    const filtered = existing.filter((s) => s.id !== submissionId);
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('team_submissions_updated', { detail: filtered }));
  } catch (e) {
    console.error('Failed to delete submission', e);
  }
}

export function updateEntireSubmissionStatus(
  submissionId: string,
  status: ApprovalStatus,
  comments: string = '',
  leaderName: string = 'Team Leader'
): void {
  const submissions = getSubmissions();
  const sub = submissions.find((s) => s.id === submissionId);
  if (!sub) return;

  sub.status = status;
  sub.leaderComments = comments;
  sub.reviewedBy = leaderName;
  sub.reviewedAt = new Date().toISOString();

  // Apply to all items inside this submission
  sub.items.forEach((item) => {
    item.status = status;
    item.leaderNotes = comments;
    item.decidedAt = new Date().toISOString();
    item.decidedBy = leaderName;
  });

  saveSubmission(sub);
}

/**
 * Generates ready-to-run MySQL / phpMyAdmin SQL script for XAMPP
 */
export function generateXamppSqlSchema(): string {
  return `-- ==========================================================
-- WADI DEGLA CLUBS - ATTENDANCE & OVERTIME DATABASE SCHEMA
-- Compatible with XAMPP MySQL / MariaDB / phpMyAdmin
-- Database: attendance_system_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS \`attendance_system_db\` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE \`attendance_system_db\`;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS \`departments\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Teams Table with Team Leader Mapping
CREATE TABLE IF NOT EXISTS \`teams\` (
  \`id\` VARCHAR(32) PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`leader_sap_id\` VARCHAR(20) NOT NULL,
  \`department_id\` INT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Users Table with Role Permissions & Team Isolation
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`sap_id\` VARCHAR(20) NOT NULL UNIQUE,
  \`name\` VARCHAR(150) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`role\` ENUM('employee', 'team_leader', 'manager', 'admin') NOT NULL DEFAULT 'employee',
  \`department_id\` INT NULL,
  \`team_id\` VARCHAR(32) NULL,
  \`title\` VARCHAR(100) NULL,
  \`password_hash\` VARCHAR(255) NULL,
  \`status\` ENUM('active', 'inactive') DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE SET NULL,
  FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Overtime Submissions Table (16th to 15th monthly cycle)
CREATE TABLE IF NOT EXISTS \`overtime_submissions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`user_sap_id\` VARCHAR(20) NOT NULL,
  \`user_name\` VARCHAR(150) NOT NULL,
  \`department\` VARCHAR(100) NOT NULL,
  \`team_id\` VARCHAR(32) NULL,
  \`period_label\` VARCHAR(100) NOT NULL,
  \`total_overtime_minutes\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  \`submitted_at\` DATETIME NOT NULL,
  \`reviewed_by\` VARCHAR(150) NULL,
  \`reviewed_at\` DATETIME NULL,
  \`leader_comments\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_sap\` (\`user_sap_id\`),
  INDEX \`idx_team\` (\`team_id\`),
  INDEX \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Overtime Daily Items & Mandatory Reasons
CREATE TABLE IF NOT EXISTS \`overtime_day_items\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`submission_id\` VARCHAR(64) NOT NULL,
  \`date\` VARCHAR(20) NOT NULL,
  \`day_of_week\` VARCHAR(20) NOT NULL,
  \`start_time\` VARCHAR(10) NOT NULL,
  \`end_time\` VARCHAR(10) NOT NULL,
  \`shift_end_standard\` VARCHAR(10) NOT NULL,
  \`overtime_minutes\` INT NOT NULL DEFAULT 0,
  \`mandatory_reason\` TEXT NOT NULL,
  \`category\` VARCHAR(30) NOT NULL DEFAULT 'overtime_manual',
  \`status\` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  \`leader_notes\` TEXT NULL,
  \`decided_by\` VARCHAR(150) NULL,
  \`decided_at\` DATETIME NULL,
  FOREIGN KEY (\`submission_id\`) REFERENCES \`overtime_submissions\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Insert Initial Default Administrator
INSERT INTO \`departments\` (\`id\`, \`name\`, \`code\`) VALUES
(1, 'Management Information Systems', 'MIS_DEPT'),
(2, 'Operations & Facilities', 'OPS_DEPT'),
(3, 'IT & Digital Systems', 'IT_DEPT'),
(4, 'Finance & Payroll', 'FIN_DEPT')
ON DUPLICATE KEY UPDATE \`name\`=\`name\`;

INSERT INTO \`users\` (\`sap_id\`, \`name\`, \`email\`, \`role\`, \`department_id\`, \`title\`) VALUES
('9999', 'Admin', 'admin@wadidegla.com', 'admin', 1, 'System Administrator')
ON DUPLICATE KEY UPDATE \`role\`='admin', \`name\`='Admin';
`;
}

/**
 * Generates PHP Backend Connector for XAMPP `htdocs/attendance/api.php`
 */
export function generateXamppPhpApi(): string {
  return `<?php
/**
 * WADI DEGLA CLUBS - ATTENDANCE & OVERTIME BACKEND API FOR XAMPP
 * Place this file inside: C:\\xampp\\htdocs\\attendance\\api.php
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = '127.0.0.1';
$db   = 'attendance_system_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed. Ensure MySQL is running in XAMPP Control Panel.',
        'details' => $e->getMessage()
    ]);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'ping':
        echo json_encode([
            'status' => 'success',
            'server' => 'XAMPP Apache / MySQL',
            'database' => $db,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        break;

    case 'get_users':
        $stmt = $pdo->query("SELECT u.id, u.sap_id as sapId, u.name, u.role, u.email, u.title, d.name as department FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.role DESC, u.name ASC");
        echo json_encode(['status' => 'success', 'data' => $stmt->fetchAll()]);
        break;

    case 'get_submissions':
        $stmt = $pdo->query("SELECT * FROM overtime_submissions ORDER BY submitted_at DESC");
        $submissions = $stmt->fetchAll();
        foreach ($submissions as &$sub) {
            $itemStmt = $pdo->prepare("SELECT * FROM overtime_day_items WHERE submission_id = ? ORDER BY date ASC");
            $itemStmt->execute([$sub['id']]);
            $sub['items'] = $itemStmt->fetchAll();
        }
        echo json_encode(['status' => 'success', 'data' => $submissions]);
        break;

    case 'save_submission':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid submission payload']);
            exit;
        }

        $stmt = $pdo->prepare("REPLACE INTO overtime_submissions (id, user_sap_id, user_name, department, period_label, total_overtime_minutes, status, submitted_at, reviewed_by, reviewed_at, leader_comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['id'],
            $data['employeeId'],
            $data['employeeName'],
            $data['department'] ?? 'General Staff',
            $data['periodLabel'] ?? '16th - 15th Cycle',
            $data['totalOvertimeMinutes'] ?? 0,
            $data['status'] ?? 'pending',
            $data['submittedAt'] ?? date('Y-m-d H:i:s'),
            $data['reviewedBy'] ?? null,
            $data['reviewedAt'] ?? null,
            $data['leaderComments'] ?? null,
        ]);

        if (!empty($data['items'])) {
            $del = $pdo->prepare("DELETE FROM overtime_day_items WHERE submission_id = ?");
            $del->execute([$data['id']]);

            $ins = $pdo->prepare("INSERT INTO overtime_day_items (submission_id, date, day_of_week, start_time, end_time, shift_end_standard, overtime_minutes, mandatory_reason, category, status, leader_notes, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $ins->execute([
                    $data['id'],
                    $item['date'],
                    $item['dayOfWeek'] ?? '',
                    $item['startTime'] ?? '',
                    $item['endTime'] ?? '',
                    $item['shiftEndStandard'] ?? '17:00',
                    $item['overtimeMinutes'] ?? 0,
                    $item['reason'] ?? 'Work assignment',
                    $item['category'] ?? 'overtime_manual',
                    $item['status'] ?? 'pending',
                    $item['leaderNotes'] ?? null,
                    $item['decidedBy'] ?? null,
                    $item['decidedAt'] ?? null,
                ]);
            }
        }

        echo json_encode(['status' => 'success', 'message' => 'Submission saved to XAMPP database successfully']);
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Unknown API action. Use action=ping, get_users, get_submissions, save_submission']);
        break;
}
`;
}
