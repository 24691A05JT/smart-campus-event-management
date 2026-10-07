import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { getAdminAnalyticsApi } from '../services/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminAnalyticsApi();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to fetch admin dashboard analytics');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError(err.response?.data?.message || 'Error connecting to server for admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader
          title="Master Admin Dashboard"
          subtitle="System-wide management console, user oversight, event moderation, and campus participation health"
        />
        <LoadingState count={4} message="Aggregating campus system metrics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader
          title="Master Admin Dashboard"
          subtitle="System-wide management console, user oversight, event moderation, and campus participation health"
        />
        <ErrorState message={error} onRetry={fetchDashboardData} />
      </div>
    );
  }

  const summary = data?.summary || {};
  const popularEvents = data?.popularEvents || [];
  const categoryDist = data?.categoryDistribution || [];
  const deptPart = data?.departmentParticipation || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <PageHeader
        title="Master Admin Dashboard"
        subtitle="System-wide management console, user oversight, event moderation, and campus participation health"
      />

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-blue-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Total Campus Users</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">👥</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalUsers || 0}</span>
            <span className="text-xs text-slate-400">Accounts</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-2">
            <span>🎓 {summary.totalStudents || 0} Students</span>
            <span>•</span>
            <span>🏫 {summary.totalOrganizers || 0} Organizers</span>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Campus Events</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">📅</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalEvents || 0}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-2">
            <span className="text-emerald-400">✓ {summary.approvedEvents || 0} Approved</span>
            <span>•</span>
            <span className="text-amber-400">⏳ {summary.pendingEvents || 0} Pending</span>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Registrations</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">📌</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{summary.totalRegistrations || 0}</span>
            <span className="text-xs text-slate-400">Student Seats</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-2">
            <span className="text-emerald-400">Attendance: {summary.overallAttendanceRate || 0}%</span>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-purple-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Event Satisfaction</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">⭐</span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {summary.averageRating ? `${summary.averageRating} / 5` : 'N/A'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Based on student feedback reviews
          </div>
        </Card>
      </div>

      {/* Admin Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
          <span>⚡ Admin Quick Actions</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link to="/admin/users">
            <Card hover className="p-5 bg-slate-900/90 border-slate-800 space-y-3 group cursor-pointer h-full">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
                👥
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition">User Management</h3>
                <p className="text-xs text-slate-400 mt-1">View campus students, faculty organizers, and admin privileges.</p>
              </div>
            </Card>
          </Link>

          <Link to="/admin/events">
            <Card hover className="p-5 bg-slate-900/90 border-slate-800 space-y-3 group cursor-pointer h-full">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
                📅
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">Manage Campus Events</h3>
                <p className="text-xs text-slate-400 mt-1">Browse, moderate, approve, or reject campus-wide event submissions.</p>
              </div>
            </Card>
          </Link>

          <Link to="/pending-approvals" className="relative">
            <Card hover className="p-5 bg-slate-900/90 border-slate-800 space-y-3 group cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  ⏳
                </div>
                {summary.pendingEvents > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {summary.pendingEvents} pending
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">Pending Approvals</h3>
                <p className="text-xs text-slate-400 mt-1">Review event proposal queue awaiting administrative sign-off.</p>
              </div>
            </Card>
          </Link>

          <Link to="/analytics">
            <Card hover className="p-5 bg-slate-900/90 border-slate-800 space-y-3 group cursor-pointer h-full">
              <div className="w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
                📊
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition">System Analytics</h3>
                <p className="text-xs text-slate-400 mt-1">Inspect interactive Recharts visualizations and participation graphs.</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Overview Breakdown Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Events Ranking */}
        <Card className="p-6 space-y-4 bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">🏆 Popular Campus Events</h3>
            <Link to="/admin/events" className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
              View All →
            </Link>
          </div>

          {popularEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No events registered yet.</p>
          ) : (
            <div className="space-y-3">
              {popularEvents.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Category: <span className="text-slate-300">{evt.category}</span> | By {evt.organizerName}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-blue-400">{evt.registeredCount} Seats</span>
                    <span className="block text-[10px] text-slate-500">Cap: {evt.maxSeats}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Category & Department Distribution */}
        <Card className="p-6 space-y-4 bg-slate-900/90 border-slate-800">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">🏷️ Category & Department Overview</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Events by Category</h4>
              <div className="flex flex-wrap gap-2">
                {categoryDist.map((cat) => (
                  <span
                    key={cat.name || cat.category}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center space-x-2"
                  >
                    <span>{cat.name || cat.category}:</span>
                    <strong className="text-blue-400">{cat.count || cat.value}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Department Participation</h4>
              <div className="space-y-2">
                {deptPart.length === 0 ? (
                  <p className="text-xs text-slate-500">No department registration data available yet.</p>
                ) : (
                  deptPart.slice(0, 4).map((d) => (
                    <div key={d.department} className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{d.department} Department</span>
                      <span className="font-bold text-emerald-400">{d.registrations} Registrations</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
