import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const roleBadges = {
    student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    organizer: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  // Role-aware nav links definition
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { label: 'Dashboard', path: '/' },
        { label: 'Explore Events', path: '/events' },
      ];
    }

    switch (user?.role) {
      case 'student':
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Explore Events', path: '/events' },
          { label: 'My Registrations', path: '/my-registrations' },
          { label: 'Certificates', path: '/certificates' },
          { label: 'Recommendations', path: '/recommendations' },
        ];
      case 'organizer':
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Create Event', path: '/create-event' },
          { label: 'My Events', path: '/my-events' },
          { label: 'Analytics', path: '/analytics' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Event Approvals', path: '/pending-approvals' },
          { label: 'Campus Events', path: '/all-events' },
          { label: 'Users', path: '/users' },
        ];
      default:
        return [{ label: 'Dashboard', path: '/' }];
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition duration-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                Smart<span className="text-blue-400">Campus</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-medium tracking-wide -mt-1">
                Event Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive(link.path)
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions / User Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* Notification Dropdown */}
                <NotificationDropdown />

                {/* Profile Badge Card */}
                <div className="flex items-center space-x-2.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                      <span className="truncate max-w-[110px]">{user?.name}</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                          roleBadges[user?.role] || 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {user?.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                      {user?.department || 'Smart Campus'}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition flex items-center space-x-1"
                >
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger Button */}
          <div className="lg:hidden flex items-center space-x-2">
            {isAuthenticated && <NotificationDropdown />}
            {isAuthenticated && (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive(link.path) ? 'bg-blue-600/20 text-blue-400' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {isAuthenticated ? (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center space-x-3 px-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold text-white uppercase">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-100">{user?.name}</div>
                  <div className="text-xs text-slate-400">
                    Role: <span className="uppercase text-blue-400 font-semibold">{user?.role}</span> | Dept: {user?.department}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-red-950/30 border border-red-900/40"
              >
                Logout Account
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
