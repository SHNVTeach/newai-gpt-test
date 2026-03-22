import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Pill, Clock, Users, Activity, Search } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useProfiles } from '../hooks/useProfiles';

export function Layout() {
  const { activeProfileId } = useProfile();
  const { profiles } = useProfiles();
  const navigate = useNavigate();
  const active = profiles.find((p) => p.id === activeProfileId);

  const navItems = [
    { to: '/', icon: Home, label: 'Today' },
    { to: '/medications', icon: Pill, label: 'Meds' },
    { to: '/conditions', icon: Activity, label: 'Conditions' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/profiles', icon: Users, label: 'Profiles' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow">
        <h1 className="text-lg font-bold tracking-tight">MedTrack</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/search')}
            className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          {active && (
            <NavLink to="/profiles" className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: active.color }}
              >
                {active.avatar}
              </span>
              <span className="text-sm font-medium">{active.name}</span>
            </NavLink>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
