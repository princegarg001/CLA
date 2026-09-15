import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Radio,
  Rocket,
  RadarIcon,
  Briefcase,
  TrendingUp,
  Bot,
  DollarSign,
  BarChart3,
  MessageSquare,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'War Room', icon: Radio, end: true },
  { to: '/apollo', label: 'Apollo Hunter', icon: Rocket },
  { to: '/freelance', label: 'Freelance Radar', icon: RadarIcon },
  { to: '/clients', label: 'Client Vault', icon: Briefcase },
  { to: '/growth', label: 'Growth Studio', icon: TrendingUp },
  { to: '/agents', label: 'AI Agent Lab', icon: Bot },
  { to: '/revenue', label: 'Revenue Command', icon: DollarSign },
  { to: '/analytics', label: 'Analytics Tower', icon: BarChart3 },
  { to: '/outreach', label: 'Outreach Composer', icon: MessageSquare },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { name, logout } = useAuth();

  const navItems = (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-amber/15 text-amber' : 'text-text-muted hover:bg-white/5 hover:text-text'
            }`
          }
        >
          <item.icon size={18} />
          {item.label}
        </NavLink>
      ))}
      <div className="h-px bg-border-soft my-2" />
      <NavLink
        to="/settings"
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive ? 'bg-amber/15 text-amber' : 'text-text-muted hover:bg-white/5 hover:text-text'
          }`
        }
      >
        <SettingsIcon size={18} />
        Settings
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-bg-soft border-r border-border-soft p-4">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-amber flex items-center justify-center text-[#221604] font-bold text-sm">A</div>
          <span className="font-bold tracking-tight">AlphoTech</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1">{navItems}</nav>
        <div className="mt-4 px-3 pt-3 border-t border-border-soft">
          {name && <p className="text-xs text-text-muted mb-2 truncate">Logged in as {name}</p>}
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-critical transition-colors">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-bg-soft border-b border-border-soft">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber flex items-center justify-center text-[#221604] font-bold text-xs">A</div>
          <span className="font-bold text-sm">AlphoTech</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2 text-text-muted">
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-bg-soft border-l border-border-soft p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-text-muted">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-1">{navItems}</nav>
            <div className="mt-4 px-3 pt-3 border-t border-border-soft">
              {name && <p className="text-xs text-text-muted mb-2 truncate">Logged in as {name}</p>}
              <button onClick={logout} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-critical transition-colors">
                <LogOut size={13} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
