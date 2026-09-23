import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  RotateCcw, 
  CheckSquare, 
  BarChart3, 
  FileText, 
  Database,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { ActiveAppTab, ThemeMode, UserProfile } from '../types';
import { WadiDeglaLogo } from './WadiDeglaLogo';
import { getTeamUsers } from '../utils/teamDatabase';
import { useLanguage } from '../i18n/LanguageContext';

interface MastheadProps {

  theme: ThemeMode;
  onToggleTheme: () => void;
  onResetSession: () => void;
  activeTab: ActiveAppTab;
  onChangeTab: (tab: ActiveAppTab) => void;
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
  onOpenDatabaseModal: () => void;
  pendingApprovalsCount: number;
}

export const Masthead: React.FC<MastheadProps> = ({
  theme,
  onToggleTheme,
  onResetSession,
  activeTab,
  onChangeTab,
  currentUser,
  onSwitchUser,
  onOpenDatabaseModal,
  pendingApprovalsCount,
}) => {
  const { t } = useLanguage();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<UserProfile[]>(() => getTeamUsers());


  React.useEffect(() => {
    const handleUpdate = () => {
      setTeamUsers(getTeamUsers());
    };
    window.addEventListener('team_users_updated', handleUpdate);
    window.addEventListener('teams_updated', handleUpdate);
    return () => {
      window.removeEventListener('team_users_updated', handleUpdate);
      window.removeEventListener('teams_updated', handleUpdate);
    };
  }, []);

  // Check 14th of month payroll cutoff
  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const isCutoffNear = currentDayOfMonth >= 10 && currentDayOfMonth <= 15;

  return (
    <header className="space-y-4 mb-6">
      {/* Top Bar: Brand, Identity, User Role Switcher, Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-xs">
            <WadiDeglaLogo className="w-full h-full" variant="image" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-1">
              AttendanceTracker<span className="text-amber-500">.</span>
            </h1>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest font-medium">
              Wadi Degla Clubs Attendance &amp; Overtime System
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="text-[10px] font-mono text-amber-400 font-bold tracking-wider uppercase">
                Made by David Kalad
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Bar: User Switcher, Reset, Theme */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* User Account Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-card border border-border hover:bg-muted/80 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-foreground font-semibold max-w-[130px] truncate">{currentUser.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                  currentUser.role === 'manager'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : currentUser.role === 'team_leader'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {currentUser.role.replace('_', ' ')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/80 flex items-center justify-between font-bold">
                  <span>Switch Profile</span>
                  {(currentUser.role === 'team_leader' || currentUser.role === 'manager' || currentUser.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        onOpenDatabaseModal();
                      }}
                      className="text-amber-500 hover:underline cursor-pointer"
                    >
                      + Manage
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                  {teamUsers.map((user) => {
                    const isSelected = user.id === currentUser.id || user.sapId === currentUser.sapId;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          onSwitchUser(user);
                          setIsUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30' : 'hover:bg-muted/80 text-foreground'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{user.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            #{user.sapId} • {user.title}
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {user.role.replace('_', ' ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reset Session */}
          <button
            onClick={onResetSession}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all shadow-2xs cursor-pointer"
            title="Clear employee details and punch ledger to start a new employee entry"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Theme Switcher */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-2xs">
            <button
              onClick={() => theme !== 'dark' && onToggleTheme()}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                theme === 'dark'
                  ? 'bg-muted text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => theme !== 'light' && onToggleTheme()}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                theme === 'light'
                  ? 'bg-muted text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

