import React from 'react';
import { ExportSettings, UserProfile } from '../types';
import {
  FileSpreadsheet,
  User,
  Hash,
  Clock,
  StickyNote,
  X,
  RotateCcw,
  Database,
  ShieldCheck,
} from 'lucide-react';
import {
  saveEmployeeMapping,
  normalizeEmployeeId,
  lookupEmployeeById,
} from '../utils/employeeDirectory';
import { getTeamForSapId } from '../utils/teamDatabase';
import { useLanguage } from '../i18n/LanguageContext';

interface ProfileCardProps {
  exportSettings: ExportSettings;
  onChangeSettings: (settings: ExportSettings) => void;
  onOpenStickyNotes: () => void;
  onOpenDirectory?: () => void;
  currentUser?: UserProfile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  exportSettings,
  onChangeSettings,
  onOpenStickyNotes,
  onOpenDirectory,
  currentUser,
}) => {
  const { t } = useLanguage();

  // Handle SAP / Employee ID Input with Strict Numeric Enforcement
  const handleIdChange = (rawId: string) => {
    // Strictly enforce numeric digits only
    const numericId = rawId.replace(/[^0-9]/g, '');

    if (!numericId) {
      onChangeSettings({
        ...exportSettings,
        employeeId: '',
      });
      return;
    }

    const team = getTeamForSapId(numericId);
    const lookedUpName = lookupEmployeeById(numericId);

    onChangeSettings({
      ...exportSettings,
      employeeId: numericId,
      name: exportSettings.name ? exportSettings.name : (lookedUpName || exportSettings.name),
      teamId: team?.id || exportSettings.teamId,
      teamName: team?.name || exportSettings.teamName,
      teamLeaderSapId: team?.leaderSapId || exportSettings.teamLeaderSapId,
      teamLeaderName: team?.leaderName || exportSettings.teamLeaderName,
    });
  };

  // Handle Employee Name change (Strict Letters Only)
  const handleNameChange = (rawName: string) => {
    const lettersOnlyName = rawName.replace(/[0-9\d]/g, '');
    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const team = getTeamForSapId(cleanId);

    onChangeSettings({
      ...exportSettings,
      name: lettersOnlyName,
      teamId: exportSettings.teamId || team?.id,
      teamName: exportSettings.teamName || team?.name,
      teamLeaderSapId: exportSettings.teamLeaderSapId || team?.leaderSapId,
      teamLeaderName: exportSettings.teamLeaderName || team?.leaderName,
    });
  };

  const handleBlurSave = () => {
    const cleanId = normalizeEmployeeId(exportSettings.employeeId);
    const cleanName = exportSettings.name.trim();
    const team = getTeamForSapId(cleanId);
    if (cleanId && cleanName) {
      saveEmployeeMapping(cleanId, cleanName, {
        teamId: exportSettings.teamId || team?.id,
        teamName: exportSettings.teamName || team?.name,
        teamLeaderSapId: exportSettings.teamLeaderSapId || team?.leaderSapId,
        teamLeaderName: exportSettings.teamLeaderName || team?.leaderName,
      });
    }
  };

  const handleClearId = () => {
    onChangeSettings({
      ...exportSettings,
      employeeId: '',
    });
  };

  const handleClearName = () => {
    onChangeSettings({
      ...exportSettings,
      name: '',
    });
  };

  const handleResetProfile = () => {
    onChangeSettings({
      ...exportSettings,
      employeeId: '',
      name: '',
    });
  };

  const update = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    onChangeSettings({ ...exportSettings, [key]: value });
  };

  const isSapValid = Boolean(
    exportSettings.employeeId?.trim() &&
    /^[0-9]+$/.test(exportSettings.employeeId.trim())
  );

  const isNameValid = Boolean(
    exportSettings.name?.trim() &&
    exportSettings.name.trim().toLowerCase() !== 'employee name' &&
    exportSettings.name.trim().toLowerCase() !== 'no employee name set'
  );

  const rawTeam = exportSettings.employeeId ? getTeamForSapId(exportSettings.employeeId) : null;
  const isSubmitterLeader = (rawTeam && normalizeEmployeeId(rawTeam.leaderSapId) === normalizeEmployeeId(exportSettings.employeeId)) || currentUser?.role === 'team_leader';

  const assignedTeam = exportSettings.teamName 
    ? { 
        name: exportSettings.teamName, 
        leaderName: exportSettings.teamLeaderName, 
        leaderSapId: exportSettings.teamLeaderSapId,
        managerName: exportSettings.managerName,
        managerSapId: exportSettings.managerSapId
      }
    : rawTeam;

  const assignedApproverName = isSubmitterLeader
    ? (assignedTeam?.managerName || exportSettings.managerName || 'Operations Director')
    : (assignedTeam?.leaderName || exportSettings.teamLeaderName || 'Team Leader');

  const assignedApproverSap = isSubmitterLeader
    ? (assignedTeam?.managerSapId || exportSettings.managerSapId || '1001')
    : (assignedTeam?.leaderSapId || exportSettings.teamLeaderSapId || '2001');

  const assignedApproverRole = isSubmitterLeader ? t('role.manager', 'Reporting Manager') : t('role.team_leader', 'Team Leader');

  return (
    <div className="bg-card border-2 border-primary/40 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-md flex flex-col justify-between gap-6" id="profile-card-section">
      {/* Card Header & Quick Tools */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
                {t('export.card_title', 'Export Overtime Log')}
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Mandatory employee profile and approval route configuration
              </p>
            </div>
          </div>

          {/* Quick Helper Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenDirectory && (
              <button
                type="button"
                onClick={onOpenDirectory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-muted/60 hover:bg-muted text-foreground border border-border transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                title="Manage local employee database"
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('export.emp_db', 'Employee DB')}</span>
              </button>
            )}

            {(exportSettings.employeeId || exportSettings.name) && (
              <button
                type="button"
                onClick={handleResetProfile}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                title="Clear entered ID & Name"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('export.reset_profile', 'Reset Profile')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenStickyNotes}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-2xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              title="Import overtime reasons from Sticky Notes"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>{t('export.sticky_notes', 'Sticky Notes')}</span>
            </button>
          </div>
        </div>

        {/* Employee Identity & Shift Parameters Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
              {t('export.params_title', 'Employee Profile & Timing')}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {t('export.mandatory_badge', 'Mandatory')}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{assignedApproverRole}: {assignedApproverName} (SAP #{assignedApproverSap})</span>
          </div>
        </div>

        {/* 3 Dedicated Parameter Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Block 1: SAP ID with Strict Numeric Input */}
          <div
            id="sap-input-box"
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-w-0 relative ${
              isSapValid ? 'bg-muted/20 border-border' : 'bg-rose-500/10 border-rose-500/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                <Hash className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{t('export.sap_label', 'SAP # (Numeric Only)')}</span>
              </label>
              {isSapValid ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                    {t('export.sap_valid', '✓ Valid SAP')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearId}
                    className="p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete / Clear SAP ID"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 shrink-0 whitespace-nowrap animate-pulse">
                  {t('export.sap_numbers_only', '⚠️ Numbers Only')}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                id="sap-input-field"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={exportSettings.employeeId}
                onChange={(e) => handleIdChange(e.target.value)}
                onBlur={handleBlurSave}
                placeholder={t('export.sap_placeholder', 'e.g. 10425')}
                className={`w-full min-w-0 bg-background rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-mono text-foreground focus:outline-hidden transition-all ${
                  isSapValid
                    ? 'border border-border focus:border-amber-500'
                    : 'border-2 border-rose-500 focus:border-rose-400 placeholder:text-rose-400/60'
                }`}
              />
              {exportSettings.employeeId && (
                <button
                  type="button"
                  onClick={handleClearId}
                  className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-muted transition-colors cursor-pointer"
                  title="Clear entered number"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Block 2: Employee Name */}
          <div
            id="name-input-box"
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-w-0 ${
              isNameValid ? 'bg-muted/20 border-border' : 'bg-rose-500/10 border-rose-500/40 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{t('export.name_label', 'Full Employee Name')}</span>
              </label>
              {isNameValid ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                    {t('export.name_set', '✓ Set')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearName}
                    className="p-1 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete / Clear Employee Name"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 shrink-0 whitespace-nowrap animate-pulse">
                  {t('export.name_type', '⚠️ Type Name')}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                id="name-input-field"
                type="text"
                value={exportSettings.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={handleBlurSave}
                placeholder={t('export.name_placeholder', 'e.g. David Kalad')}
                className={`w-full min-w-0 bg-background rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-mono text-foreground focus:outline-hidden transition-all ${
                  isNameValid
                    ? 'border border-border focus:border-amber-500'
                    : 'border-2 border-rose-500 focus:border-rose-400 placeholder:text-rose-400/60'
                }`}
              />
              {exportSettings.name && (
                <button
                  type="button"
                  onClick={handleClearName}
                  className="absolute right-2.5 p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-muted transition-colors cursor-pointer"
                  title="Delete / Clear name"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Block 3: Shift End ("From" Time) */}
          <div className="p-5 rounded-2xl border border-border bg-muted/20 flex flex-col justify-between min-w-0 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-2 mb-3">
              <label className="text-xs font-mono uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{t('export.shift_end_label', 'Shift End Time')}</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0 whitespace-nowrap">
                {t('export.name_set', '✓ Set')}
              </span>
            </div>

            <div>
              <input
                type="time"
                value={exportSettings.shiftEnd}
                onChange={(e) => update('shiftEnd', e.target.value)}
                className="w-full min-w-0 bg-background border border-border focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
