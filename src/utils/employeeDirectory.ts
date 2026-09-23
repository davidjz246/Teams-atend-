// Employee ID Directory and Auto-Lookup Service (Local Database)
import { EmployeeRecord } from '../types';

const STORAGE_KEY = 'ledger_employee_directory_v5';
const LEGACY_STORAGE_KEYS = ['ledger_employee_directory', 'ledger_employee_directory_v2', 'ledger_employee_directory_v3', 'ledger_employee_directory_v4'];

export const DEFAULT_EMPLOYEE_DIRECTORY: Record<string, EmployeeRecord> = {};

/**
 * Normalizes an employee ID by stripping any non-numeric characters.
 * SAP / Employee numbers must be strictly numeric digits.
 */
export function normalizeEmployeeId(id: string): string {
  if (!id) return '';
  return id.replace(/[^0-9]/g, '').trim();
}

/**
 * Retrieves the full employee directory from localStorage
 */
export function getEmployeeDirectory(): Record<string, EmployeeRecord> {
  try {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      const normalized: Record<string, EmployeeRecord> = {};
      
      for (const [k, v] of Object.entries(parsed)) {
        const cleanK = normalizeEmployeeId(k);
        if (!cleanK) continue;
        
        if (typeof v === 'string') {
          normalized[cleanK] = {
            id: cleanK,
            name: v.trim(),
          };
        } else if (typeof v === 'object' && v !== null) {
          const rec = v as EmployeeRecord;
          normalized[cleanK] = {
            id: cleanK,
            name: (rec.name || '').trim(),
            department: rec.department,
            teamId: rec.teamId,
            teamName: rec.teamName,
            teamLeaderSapId: rec.teamLeaderSapId,
            teamLeaderName: rec.teamLeaderName,
          };
        }
      }
      return normalized;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EMPLOYEE_DIRECTORY));
    return { ...DEFAULT_EMPLOYEE_DIRECTORY };
  } catch (e) {
    console.error('Failed to load employee directory:', e);
    return { ...DEFAULT_EMPLOYEE_DIRECTORY };
  }
}

/**
 * Look up full employee record by numeric SAP ID
 */
export function getEmployeeRecordById(empId: string): EmployeeRecord | null {
  if (!empId) return null;
  const cleanId = normalizeEmployeeId(empId);
  if (!cleanId) return null;

  const directory = getEmployeeDirectory();
  if (directory[cleanId]) return directory[cleanId];

  // Try numeric comparison
  const numId = parseInt(cleanId, 10);
  if (!isNaN(numId)) {
    for (const [key, rec] of Object.entries(directory)) {
      const keyNum = parseInt(key, 10);
      if (!isNaN(keyNum) && keyNum === numId) {
        return rec;
      }
    }
  }

  return null;
}

/**
 * Look up employee name by numeric SAP ID
 */
export function lookupEmployeeById(empId: string): string | null {
  const rec = getEmployeeRecordById(empId);
  return rec ? rec.name : null;
}

/**
 * Look up employee ID by name
 */
export function lookupEmployeeByName(name: string): string | null {
  if (!name || !name.trim()) return null;
  const cleanName = name.trim().toLowerCase();
  const directory = getEmployeeDirectory();

  for (const [id, rec] of Object.entries(directory)) {
    if (rec.name.toLowerCase() === cleanName) {
      return id;
    }
  }
  return null;
}

export interface DuplicateCheckResult {
  hasConflict: boolean;
  type?: 'sap_conflict' | 'name_conflict' | 'exact_match';
  conflictMessage?: string;
  conflictingRecord?: {
    id: string;
    name: string;
    role?: string;
    source: 'users' | 'directory';
  };
}

/**
 * Checks across all database sources (users & employee directory)
 * to ensure that neither the SAP ID nor the Employee Name is duplicated.
 * 
 * Rules:
 * 1. SAP Number Uniqueness: A SAP ID cannot be reused by a different person (different name).
 * 2. Name Uniqueness: A Person Name cannot be registered under a different SAP ID.
 */
export function checkDuplicateEmployeeOrUser(
  sapId: string,
  name: string,
  options?: {
    excludeSapId?: string;
    excludeName?: string;
  }
): DuplicateCheckResult {
  const cleanSap = normalizeEmployeeId(sapId);
  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  const excludeSap = options?.excludeSapId ? normalizeEmployeeId(options.excludeSapId) : '';
  const excludeLowerName = options?.excludeName ? options.excludeName.trim().toLowerCase() : '';

  // 1. Check in User Accounts (Team Database)
  try {
    const rawUsers = localStorage.getItem('wdc_team_users_v7');
    if (rawUsers) {
      const users: Array<{ id: string; sapId: string; name: string; role?: string }> = JSON.parse(rawUsers);
      for (const u of users) {
        const uSap = normalizeEmployeeId(u.sapId);
        const uLowerName = (u.name || '').trim().toLowerCase();

        // If this is the exact excluded record, skip
        if (excludeSap && uSap === excludeSap) continue;
        if (excludeLowerName && uLowerName === excludeLowerName && (!cleanSap || uSap === cleanSap)) continue;

        // Check SAP Conflict: Same SAP but Different Name
        if (cleanSap && uSap === cleanSap) {
          if (cleanName && uLowerName !== lowerName) {
            return {
              hasConflict: true,
              type: 'sap_conflict',
              conflictMessage: `SAP ID #${cleanSap} is already registered to "${u.name}" (${(u.role || 'user').replace('_', ' ')}).`,
              conflictingRecord: {
                id: uSap,
                name: u.name,
                role: u.role,
                source: 'users',
              },
            };
          }
        }

        // Check Name Conflict: Same Name but Different SAP ID
        if (cleanName && uLowerName === lowerName) {
          if (cleanSap && uSap !== cleanSap) {
            return {
              hasConflict: true,
              type: 'name_conflict',
              conflictMessage: `Employee name "${u.name}" is already registered with SAP ID #${uSap} (${(u.role || 'user').replace('_', ' ')}).`,
              conflictingRecord: {
                id: uSap,
                name: u.name,
                role: u.role,
                source: 'users',
              },
            };
          } else if (!cleanSap) {
            return {
              hasConflict: true,
              type: 'name_conflict',
              conflictMessage: `Employee name "${u.name}" is already registered with SAP ID #${uSap} (${(u.role || 'user').replace('_', ' ')}).`,
              conflictingRecord: {
                id: uSap,
                name: u.name,
                role: u.role,
                source: 'users',
              },
            };
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading users for duplicate check', e);
  }

  // 2. Check in Employee Directory
  try {
    const directory = getEmployeeDirectory();
    for (const [id, rec] of Object.entries(directory)) {
      const recSap = normalizeEmployeeId(id);
      const recLowerName = (rec.name || '').trim().toLowerCase();

      if (excludeSap && recSap === excludeSap) continue;
      if (excludeLowerName && recLowerName === excludeLowerName && (!cleanSap || recSap === cleanSap)) continue;

      // Check SAP Conflict
      if (cleanSap && recSap === cleanSap) {
        if (cleanName && recLowerName !== lowerName) {
          return {
            hasConflict: true,
            type: 'sap_conflict',
            conflictMessage: `SAP ID #${cleanSap} is already assigned to "${rec.name}" in Employee Directory.`,
            conflictingRecord: {
              id: recSap,
              name: rec.name,
              source: 'directory',
            },
          };
        }
      }

      // Check Name Conflict
      if (cleanName && recLowerName === lowerName) {
        if (cleanSap && recSap !== cleanSap) {
          return {
            hasConflict: true,
            type: 'name_conflict',
            conflictMessage: `Employee name "${rec.name}" is already assigned to SAP ID #${recSap} in Employee Directory.`,
            conflictingRecord: {
              id: recSap,
              name: rec.name,
              source: 'directory',
            },
          };
        } else if (!cleanSap) {
          return {
            hasConflict: true,
            type: 'name_conflict',
            conflictMessage: `Employee name "${rec.name}" is already assigned to SAP ID #${recSap} in Employee Directory.`,
            conflictingRecord: {
              id: recSap,
              name: rec.name,
              source: 'directory',
            },
          };
        }
      }
    }
  } catch (e) {
    console.error('Error reading directory for duplicate check', e);
  }

  return { hasConflict: false };
}

/**
 * Saves or updates an Employee record in localStorage
 */
export function saveEmployeeMapping(
  empId: string, 
  name: string, 
  extra?: { department?: string; teamId?: string; teamName?: string; teamLeaderSapId?: string; teamLeaderName?: string }
): void {
  const cleanId = normalizeEmployeeId(empId);
  const cleanName = name.trim();
  if (!cleanId || !cleanName) return;

  try {
    const current = getEmployeeDirectory();
    const existing = current[cleanId] || { id: cleanId, name: cleanName };

    current[cleanId] = {
      ...existing,
      id: cleanId,
      name: cleanName,
      department: extra?.department ?? existing.department,
      teamId: extra?.teamId ?? existing.teamId,
      teamName: extra?.teamName ?? existing.teamName,
      teamLeaderSapId: extra?.teamLeaderSapId ?? existing.teamLeaderSapId,
      teamLeaderName: extra?.teamLeaderName ?? existing.teamLeaderName,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee_directory_updated', {
        detail: { id: cleanId, name: cleanName, record: current[cleanId], directory: current },
      }));
    }
  } catch (e) {
    console.error('Failed to save employee mapping:', e);
  }
}

/**
 * Permanently removes an employee mapping by Employee ID
 */
export function deleteEmployeeMapping(empId: string): void {
  const cleanId = normalizeEmployeeId(empId);
  if (!cleanId) return;

  try {
    const current = getEmployeeDirectory();
    delete current[cleanId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee_directory_updated', {
        detail: { id: cleanId, deleted: true, directory: current },
      }));
    }
  } catch (e) {
    console.error('Failed to delete employee mapping:', e);
  }
}

/**
 * Clears all employee records from the directory
 */
export function clearAllEmployeeDirectory(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee_directory_updated', {
        detail: { cleared: true, directory: {} },
      }));
    }
  } catch (e) {
    console.error('Failed to clear employee directory:', e);
  }
}

/**
 * Returns all directory entries as a sorted array of EmployeeRecords
 */
export function getAllEmployees(): EmployeeRecord[] {
  const directory = getEmployeeDirectory();
  return Object.values(directory)
    .sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
}
