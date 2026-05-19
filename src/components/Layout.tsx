import { Link, NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
      end
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-pink-400" />
            TalkSim
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/">Practice</NavItem>
            <NavItem to="/settings">Settings</NavItem>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
