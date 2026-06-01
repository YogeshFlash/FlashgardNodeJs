import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, LayoutDashboard,
  LogOut, Bell, Search, Settings, ChevronDown,
  UserCircle, Menu, X, Boxes, Warehouse, Key, Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, exact: true },
  { name: 'Organizations', path: '/organizations', icon: Building2 },
  { name: 'Models', path: '/models', icon: Boxes },
  { name: 'Inventory', path: '/inventory', icon: Warehouse },
  { name: 'Licenses', path: '/licenses', icon: Key },
  { name: 'Data Migration', path: '/migration', icon: Database },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const Sidebar = ({ 
  mobile = false, 
  onClose, 
  collapsed = false, 
  onToggle 
}: { 
  mobile?: boolean; 
  onClose?: () => void; 
  collapsed?: boolean; 
  onToggle?: () => void;
}) => {
  const { user } = useAuth();
  return (
    <aside className={`${mobile ? 'w-full' : `${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 fixed left-0 top-0 h-screen`} bg-zinc-950 text-slate-300 flex flex-col z-20`}>
      <div className={`h-16 flex items-center px-6 border-b border-zinc-900 bg-zinc-950 ${collapsed ? 'justify-center px-0' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 font-bold text-white tracking-wide ${collapsed ? 'hidden' : 'flex'}`}>
          <img src={logo} alt="Flashgard" className="w-8 h-8 object-contain" />
          <span className="text-lg">Flashgard</span>
        </div>
        <button 
          onClick={onToggle}
          className={`p-1.5 text-slate-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors ${collapsed ? '' : 'ml-2'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
        {mobile && (
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-2">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className={`flex-1 py-6 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            onClick={onClose}
            title={collapsed ? item.name : ''}
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-all font-medium text-sm gap-3
              ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
              ${isActive
                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                : 'hover:bg-zinc-900 hover:text-white text-slate-400'}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && item.name}
          </NavLink>
        ))}
      </nav>

      <div className={`p-4 border-t border-zinc-900 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <>
            {user?.isSuperAdmin ? (
              <div className="mb-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400 text-xs font-semibold">⚡ Platform Admin</p>
              </div>
            ) : user?.organization && (
              <div className="mb-3 px-3 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg">
                <p className="text-[var(--color-primary)] text-xs font-semibold">🏛️ {user.organization.name}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 px-3 mb-2 truncate">
              {user?.organization?.name || 'Flashgard'}
            </p>
          </>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs text-slate-500">
            {user?.email?.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
    </aside>
  );
};

const Topbar = ({ 
  onMenuClick, 
  collapsed = false, 
}: { 
  onMenuClick: () => void; 
  collapsed?: boolean; 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'SA';

  return (
    <header className={`h-16 bg-white border-b border-slate-200 fixed top-0 right-0 z-30 flex items-center justify-between px-6 transition-all duration-300 ${collapsed ? 'left-20' : 'left-64'} max-[768px]:left-0`}>
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-80 hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search organizations, users..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen(p => !p)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-700 leading-tight">
                {user?.isSuperAdmin ? 'Platform Admin' : user?.organization?.name || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-sm font-semibold text-slate-800">{user?.email}</p>
                <p className="text-xs text-slate-500">
                  {user?.isSuperAdmin ? 'Platform Administrator' : 'Administrator'}
                </p>
              </div>
              <button
                onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserCircle className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <Topbar 
        onMenuClick={() => setMobileOpen(true)} 
        collapsed={isCollapsed}
      />

      <main className={`transition-all duration-300 pt-16 min-h-screen overflow-y-auto ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
