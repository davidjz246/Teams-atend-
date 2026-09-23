import React from 'react';
import { ActiveAppTab, UserProfile } from '../types';
import { FileText, CheckSquare, BarChart3, Database } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface FloatingPortalDockProps {
  activeTab: ActiveAppTab;
  onChangeTab: (tab: ActiveAppTab) => void;
  onOpenDatabase: () => void;
  pendingApprovalsCount: number;
  currentUser: UserProfile;
}

export const FloatingPortalDock: React.FC<FloatingPortalDockProps> = ({
  activeTab,
  onChangeTab,
  onOpenDatabase,
  pendingApprovalsCount,
  currentUser,
}) => {
  const { t } = useLanguage();
  const isEmployee = currentUser.role === 'employee';
  const isTeamLeader = currentUser.role === 'team_leader';
  const isManager = currentUser.role === 'manager';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div className="pointer-events-auto bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-2 flex items-center justify-between gap-2 ring-1 ring-black/5 transition-all">
        {/* TAB 1: EMPLOYEE (Visible to all) */}
        <button
          type="button"
          onClick={() => onChangeTab('employee_ledger')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'employee_ledger'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-muted/50 hover:bg-muted text-foreground'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{t('app.my_timesheet')}</span>
          <span className="sm:hidden">{t('app.my_timesheet')}</span>
        </button>

        {/* TAB 2: TEAM LEADER (Hidden from Employee) */}
        {(isTeamLeader || isManager || isAdmin) && (
          <button
            type="button"
            onClick={() => onChangeTab('team_leader_approvals')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'team_leader_approvals'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t('app.team_leader')}</span>
            <span className="sm:hidden">{t('app.approvals')}</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        )}

        {/* TAB 3: MANAGER (Hidden from Employee & Team Leader) */}
        {(isManager || isAdmin) && (
          <button
            type="button"
            onClick={() => onChangeTab('manager_overview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'manager_overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t('app.manager_matrix')}</span>
            <span className="sm:hidden">{t('app.matrix')}</span>
          </button>
        )}

        {/* TAB 4: DATABASE & ADMIN */}
        {(isAdmin || isManager || isTeamLeader) && (
          <button
            type="button"
            onClick={onOpenDatabase}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30"
            title="Database Center"
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">{t('app.database_hub')}</span>
          </button>
        )}
      </div>
    </div>
  );
};


