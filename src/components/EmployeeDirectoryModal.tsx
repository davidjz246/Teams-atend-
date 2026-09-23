import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Hash,
  UserCheck,
  UserX,
  Sparkles,
  Download,
  Upload,
  Database,
  ArrowRight,
  Building,
  ShieldCheck,
} from 'lucide-react';
import {
  getAllEmployees,
  saveEmployeeMapping,
  deleteEmployeeMapping,
  clearAllEmployeeDirectory,
  normalizeEmployeeId,
  checkDuplicateEmployeeOrUser,
} from '../utils/employeeDirectory';
import { getTeams } from '../utils/teamDatabase';
import { EmployeeRecord, TeamInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface EmployeeDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee: (id: string, name: string) => void;
  currentId: string;
}

export const EmployeeDirectoryModal: React.FC<EmployeeDirectoryModalProps> = ({
  isOpen,
  onClose,
  onSelectEmployee,
  currentId,
}) => {
  const { t, language } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>(() => getTeams());
  const [searchQuery, setSearchQuery] = useState('');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveConflict = (newId.trim() || newName.trim()) 
    ? checkDuplicateEmployeeOrUser(newId, newName) 
    : { hasConflict: false };

  const reloadEmployees = () => {
    setEmployees(getAllEmployees());
    setTeams(getTeams());
  };

  useEffect(() => {
    if (isOpen) {
      reloadEmployees();
      setSearchQuery('');
      setSuccessMessage(null);
      setDeletingId(null);
      setIsConfirmingClearAll(false);
      const allTeams = getTeams();
      if (allTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(allTeams[0].id);
      }
    }
  }, [isOpen]);

  // Listen to external updates
  useEffect(() => {
    const handleUpdate = () => {
      reloadEmployees();
    };
    window.addEventListener('employee_directory_updated', handleUpdate);
    window.addEventListener('teams_updated', handleUpdate);
    return () => {
      window.removeEventListener('employee_directory_updated', handleUpdate);
      window.removeEventListener('teams_updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const handleAddAndSelectEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = normalizeEmployeeId(newId);
    const cleanName = newName.trim();
    if (!cleanId || !cleanName) return;

    // Check for duplicate SAP ID or Duplicate Name across the app
    const dupCheck = checkDuplicateEmployeeOrUser(cleanId, cleanName);
    if (dupCheck.hasConflict) {
      alert(`⚠️ ${t('dir.dup_err', 'Duplication Error')}:\n${dupCheck.conflictMessage}`);
      return;
    }

    const team = teams.find((t) => t.id === selectedTeamId);

    // 1. Save to local database with team metadata
    saveEmployeeMapping(cleanId, cleanName, {
      teamId: team?.id,
      teamName: team?.name,
      teamLeaderSapId: team?.leaderSapId,
      teamLeaderName: team?.leaderName,
      department: team?.department,
    });

    // 2. Automatically select and activate for the current session
    onSelectEmployee(cleanId, cleanName);

    // 3. Refresh directory state
    reloadEmployees();
    setSuccessMessage(`✓ ${t('dir.saved_activated', 'Saved & Activated')}: ID #${cleanId} — ${cleanName}`);
    setNewId('');
    setNewName('');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleSelectRecord = (id: string, name: string) => {
    onSelectEmployee(id, name);
    setSuccessMessage(`Activated ID #${id} — ${name}`);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEmployeeMapping(id);
    if (normalizeEmployeeId(currentId) === normalizeEmployeeId(id)) {
      onSelectEmployee('', '');
    }
    reloadEmployees();
    setDeletingId(null);
    setSuccessMessage(`Deleted ID #${id}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleClearAllDirectory = () => {
    clearAllEmployeeDirectory();
    onSelectEmployee('', '');
    reloadEmployees();
    setIsConfirmingClearAll(false);
    setSuccessMessage(t('dir.cleared_all', 'Cleared all local employee records'));
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleClearSelection = () => {
    onSelectEmployee('', '');
    setSuccessMessage(t('dir.unselected', 'Unselected active employee'));
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Export directory to JSON backup
  const handleExportBackup = () => {
    const data = getAllEmployees();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_directory_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import directory from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          let count = 0;
          parsed.forEach((item: any) => {
            if (item && (item.id || item.employeeId) && (item.name || item.employeeName)) {
              const id = normalizeEmployeeId(item.id || item.employeeId);
              const name = (item.name || item.employeeName || '').trim();
              if (id && name) {
                saveEmployeeMapping(id, name, {
                  teamId: item.teamId,
                  teamName: item.teamName,
                  teamLeaderSapId: item.teamLeaderSapId,
                  teamLeaderName: item.teamLeaderName,
                });
                count++;
              }
            }
          });
          reloadEmployees();
          setSuccessMessage(`Imported ${count} employee records successfully`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else if (typeof parsed === 'object' && parsed !== null) {
          let count = 0;
          Object.entries(parsed).forEach(([key, val]) => {
            const id = normalizeEmployeeId(key);
            const name = typeof val === 'string' ? val.trim() : (val as any)?.name?.trim();
            if (id && name) {
              saveEmployeeMapping(id, name);
              count++;
            }
          });
          reloadEmployees();
          setSuccessMessage(`Imported ${count} employee records`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          alert('Invalid JSON structure. Expected array of employee records.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.id.includes(searchQuery.trim()) ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (emp.teamName && emp.teamName.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  const normalizedCurrentId = normalizeEmployeeId(currentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-border/80 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-foreground flex items-center gap-2">
                <span>{t('dir.title', 'Employee SAP Directory')}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  {employees.length} {employees.length === 1 ? t('dir.emp_single', 'employee') : t('dir.emp_plural', 'employees')}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                {t('dir.subtitle', 'System directory for numeric SAP IDs & employee records')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Employee Indicator */}
          {normalizedCurrentId && (
            <div className="p-3.5 rounded-2xl border border-teal-500/40 bg-teal-500/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-teal-500 text-black flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-mono min-w-0 truncate">
                  <span className="text-muted-foreground">{t('dir.active_in_ledger', 'Active in Ledger:')} </span>
                  <span className="font-bold text-foreground">SAP #{normalizedCurrentId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                title={t('dir.unselect_btn', 'Clear selected employee from ledger')}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>{t('dir.unselect_btn', 'Unselect')}</span>
              </button>
            </div>
          )}

          {/* Add / Update Employee Record Form */}
          <form
            onSubmit={handleAddAndSelectEmployee}
            className="p-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{t('dir.save_new', 'Save New Employee (Numeric SAP)')}</span>
              </span>
              {successMessage && (
                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> {successMessage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3 relative flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={t('export.sap_id', 'SAP ID')}
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-3 pr-7 py-2.5 bg-background border border-border rounded-xl font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
                {newId && (
                  <button
                    type="button"
                    onClick={() => setNewId('')}
                    className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="sm:col-span-4 relative flex items-center">
                <input
                  type="text"
                  inputMode="text"
                  placeholder={t('export.name', 'Employee Name')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                  className="w-full pl-3 pr-7 py-2.5 bg-background border border-border rounded-xl font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
                {newName && (
                  <button
                    type="button"
                    onClick={() => setNewName('')}
                    className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="sm:col-span-3">
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full py-2.5 px-2 bg-background border border-border rounded-xl font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!newId.trim() || !newName.trim() || liveConflict.hasConflict}
                  className="w-full h-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('dir.save_btn', 'Save')}</span>
                </button>
              </div>
            </div>

            {liveConflict.hasConflict && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
                <span className="font-bold">⚠️ {t('dir.dup_err', 'Duplicate Error')}:</span>
                <span>{liveConflict.conflictMessage}</span>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground font-mono">
              💡 {t('dir.tip', 'Tip: Save records with numeric SAP IDs and clean employee names.')}
            </p>
          </form>

          {/* Search Box & Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('dir.search_placeholder', 'Search by SAP # or Name...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-muted/40 border border-border rounded-xl text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={employees.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                title={t('dir.backup_btn', 'Export Database to JSON file')}
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">{t('dir.backup_btn', 'Backup')}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer shadow-2xs"
                title={t('dir.restore_btn', 'Import Database from JSON file')}
              >
                <Upload className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">{t('dir.restore_btn', 'Restore')}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>

          {/* Directory Records List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl">
                <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs font-mono text-muted-foreground">
                  {searchQuery ? t('dir.no_match', 'No employees matching your search') : t('dir.empty_dir', 'Directory is currently empty')}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  {t('dir.add_tip', 'Add employee records above to build your team database.')}
                </p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isCurrent = normalizedCurrentId === normalizeEmployeeId(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectRecord(emp.id, emp.name)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isCurrent
                        ? 'border-teal-500 bg-teal-500/15 shadow-sm'
                        : 'border-border/80 bg-muted/20 hover:border-teal-500/50 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-teal-500 text-black'
                            : 'bg-muted border border-border text-muted-foreground group-hover:border-teal-500/40 group-hover:text-teal-400'
                        }`}
                      >
                        #{emp.id}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate flex items-center gap-2">
                          <span>{emp.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500 text-black font-bold">
                              {t('dir.active_badge', 'ACTIVE')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          SAP #{emp.id} {emp.teamName ? `• ${emp.teamName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRecord(emp.id, emp.name);
                        }}
                        className="p-1.5 rounded-lg text-xs font-mono font-medium text-teal-400 hover:bg-teal-500/20 transition-colors flex items-center gap-1"
                        title={t('dir.use_btn', 'Use this employee in ledger')}
                      >
                        <span>{t('dir.use_btn', 'Use')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {deletingId === emp.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => confirmDelete(emp.id, e)}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white font-mono text-[10px] font-bold hover:bg-rose-500 transition-colors"
                          >
                            {t('dir.confirm_del', 'Confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(emp.id);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete employee record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/80 bg-muted/30 flex items-center justify-between gap-3">
          {isConfirmingClearAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-rose-400 font-bold">
                {t('dir.clear_confirm_q', 'Clear all records?')}
              </span>
              <button
                type="button"
                onClick={handleClearAllDirectory}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold"
              >
                {t('dir.yes_clear', 'Yes, Clear All')}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="px-2.5 py-1 rounded-xl bg-muted text-foreground text-xs font-mono"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={employees.length === 0}
              onClick={() => setIsConfirmingClearAll(true)}
              className="text-xs font-mono text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('dir.clear_dir', 'Clear Directory')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-mono text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer shadow-2xs"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
