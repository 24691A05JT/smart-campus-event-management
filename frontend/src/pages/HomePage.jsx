import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/common/Card';
import { Badge, StatusBadge } from '../components/common/Badge';
import EventCard from '../components/common/EventCard';
import SectionHeader from '../components/common/SectionHeader';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { getApprovedEventsApi, getMyEventsApi, getPendingEventsApi, checkHealth } from '../services/api';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const [approvedEvents, setApprovedEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [isAuthenticated, user?.role]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Always fetch public approved events
      const approvedRes = await getApprovedEventsApi();
      if (approvedRes.success) {
        setApprovedEvents(approvedRes.data);
      }

      // Check system health
      try {
        const healthRes = await checkHealth();
        setHealthStatus(healthRes);
      } catch (hErr) {
        // Health check non-blocking
      }

      // Fetch role-specific data if logged in
      if (isAuthenticated) {
        if (user?.role === 'organizer') {
          const myRes = await getMyEventsApi();
          if (myRes.success) setMyEvents(myRes.data);
        } else if (user?.role === 'admin') {
          const pendingRes = await getPendingEventsApi();
          if (pendingRes.success) setPendingEvents(pendingRes.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Render role-specific dashboard header
  const renderHeroSection = () => {
    if (!isAuthenticated) {
      return (
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border border-slate-800 p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider mb-4 inline-block">
              Campus Intelligence Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Smart Campus Event Management System
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
              Connect. Participate. Grow. Discover campus events, workshops, hackathons, and activities tailored to your academic profile.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button variant="primary" size="md">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="md">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    switch (user?.role) {
      case 'student':
        return (
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-slate-800 p-8 sm:p-10 overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mb-3 inline-block">
                Student Portal
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name || 'Student'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Find events that match your interests and make your campus experience count.
              </p>
            </div>
          </div>
        );

      case 'organizer':
        return (
          <div className="relative rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-slate-800 p-8 sm:p-10 overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider mb-3 inline-block">
                Faculty & Organizer Console
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Manage Your Campus Events
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Create new events, track attendance, avoid venue schedule conflicts, and view participation metrics.
              </p>
              <div className="mt-5">
                <Link to="/create-event">
                  <Button variant="primary" size="sm">Create New Event ➕</Button>
                </Link>
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="relative rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950 border border-slate-800 p-8 sm:p-10 overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mb-3 inline-block">
                System Administration
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Campus Event Administration
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Review submitted event requests, oversee campus participation, and monitor platform health.
              </p>
              <div className="mt-5">
                <Link to="/pending-approvals">
                  <Button variant="primary" size="sm">Review Pending Approvals 📋</Button>
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render Stats Grid
  const renderStatsGrid = () => {
    if (!isAuthenticated) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Events</p>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">{approvedEvents.length}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categories</p>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">5+ Active</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departments</p>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">All Eligible</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">Operational</span>
            </div>
          </Card>
        </div>
      );
    }

    if (user?.role === 'organizer') {
      const pendingCount = myEvents.filter((e) => e.status === 'pending').length;
      const approvedCount = myEvents.filter((e) => e.status === 'approved').length;
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Created</p>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">{myEvents.length}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{approvedCount}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approval</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{pendingCount}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campus Reach</p>
            <p className="text-2xl font-extrabold text-blue-400 mt-1">Active</p>
          </Card>
        </div>
      );
    }

    if (user?.role === 'admin') {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Events</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{approvedEvents.length}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{pendingEvents.length}</p>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Health</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">Online</span>
            </div>
          </Card>
          <Card padding="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Role</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-1">Admin</p>
          </Card>
        </div>
      );
    }

    // Default Student Stats
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Events</p>
          <p className="text-2xl font-extrabold text-slate-100 mt-1">{approvedEvents.length}</p>
        </Card>
        <Card padding="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</p>
          <p className="text-base font-bold text-blue-400 truncate mt-1">{user?.department || 'General'}</p>
        </Card>
        <Card padding="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Interests</p>
          <p className="text-xs font-semibold text-slate-300 truncate mt-2">
            {user?.interests?.length > 0 ? user.interests.join(', ') : 'Add in profile'}
          </p>
        </Card>
        <Card padding="p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registration Status</p>
          <p className="text-xs font-semibold text-emerald-400 mt-2">Active Student</p>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      {renderHeroSection()}

      {/* Stats Summary Grid */}
      {renderStatsGrid()}

      {/* Main Section: Approved Upcoming Events */}
      <div className="space-y-6">
        <SectionHeader
          title="Upcoming Campus Events"
          subtitle="Browse approved technical workshops, cultural meets, and sports tournaments"
          actionText="View All Events"
          actionLink="/events"
        />

        {loading ? (
          <LoadingState count={3} message="Fetching upcoming events..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : approvedEvents.length === 0 ? (
          <EmptyState
            title="No Upcoming Events"
            description="There are currently no approved upcoming events scheduled."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedEvents.slice(0, 6).map((evt) => (
              <EventCard key={evt._id} event={evt} />
            ))}
          </div>
        )}
      </div>

      {/* Organizer Specific My Events Section */}
      {isAuthenticated && user?.role === 'organizer' && myEvents.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          <SectionHeader
            title="Recent Events You Organized"
            subtitle="Status updates and management for your submitted events"
            actionText="Go to My Events"
            actionLink="/my-events"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myEvents.slice(0, 3).map((evt) => (
              <EventCard key={evt._id} event={evt} showStatus />
            ))}
          </div>
        </div>
      )}

      {/* Admin Specific Pending Approvals Queue Section */}
      {isAuthenticated && user?.role === 'admin' && pendingEvents.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-slate-800/80">
          <SectionHeader
            title="Pending Event Approval Queue"
            subtitle="Review pending event submissions awaiting moderation"
            actionText="Review Queue"
            actionLink="/pending-approvals"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingEvents.slice(0, 3).map((evt) => (
              <EventCard key={evt._id} event={evt} showStatus />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
