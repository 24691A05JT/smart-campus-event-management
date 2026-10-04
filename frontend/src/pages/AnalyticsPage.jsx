import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getAnalyticsApi } from '../services/api';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#06B6D4'];

export default function AnalyticsPage() {
  const [role, setRole] = useState('organizer');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsApi();
      if (res.success) {
        setRole(res.role || 'organizer');
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState count={4} message="Aggregating engagement analytics metrics..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Analytics data unavailable'} onRetry={fetchAnalytics} />;
  }

  const summary = data.summary || {};
  const isZeroEvents = summary.totalEvents === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === 'admin' ? 'Campus-Wide Engagement Analytics' : 'Organizer Activity Analytics'}
        subtitle={
          role === 'admin'
            ? 'Master institution overview of student participation, event distributions, and attendance'
            : 'Performance metrics, registration tracking, and attendance stats for your organized events'
        }
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )}
      />

      {isZeroEvents ? (
        <EmptyState
          title="No Analytics Data Available"
          description="Create and organize campus events to generate real-time participation metrics and engagement analytics."
        />
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-between border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Events</div>
              <div className="text-3xl font-bold text-slate-100 mt-2">{summary.totalEvents || 0}</div>
              <div className="text-xs text-slate-400 mt-1 flex space-x-2">
                <span className="text-emerald-400">{summary.approvedEvents || 0} Approved</span>
                <span className="text-amber-400">{summary.pendingEvents || 0} Pending</span>
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registrations</div>
              <div className="text-3xl font-bold text-indigo-400 mt-2">{summary.totalRegistrations || 0}</div>
              <div className="text-xs text-slate-400 mt-1">Student Enrollments</div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
              <div className="text-3xl font-bold text-emerald-400 mt-2">
                {summary.attendanceRate !== undefined ? summary.attendanceRate : summary.overallAttendanceRate || 0}%
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.presentCount || 0} Present / {summary.absentCount || 0} Absent
              </div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Rating</div>
              <div className="text-3xl font-bold text-amber-400 mt-2 flex items-center space-x-1">
                <span>{summary.averageRating > 0 ? summary.averageRating : 'N/A'}</span>
                <span className="text-xl">★</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Student Feedback Score</div>
            </Card>
          </div>

          {/* Charts Row 1: Registrations per Event & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event Registration & Capacity Chart */}
            <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-100">Event Registration & Seat Capacity</h3>
                <p className="text-xs text-slate-400">Comparing enrolled students against maximum seat limits</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.registrationsByEvent || data.eventsOverview || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#F8FAFC' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="registrations" name="Registered" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="capacity" name="Max Capacity" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category Distribution Pie Chart */}
            <Card className="p-6 flex flex-col justify-between">
              <div className="mb-2">
                <h3 className="text-base font-bold text-slate-100">Events by Category</h3>
                <p className="text-xs text-slate-400">Distribution across technical, cultural, and sports activities</p>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryStats || data.categoryDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey={data.categoryDistribution ? 'value' : 'count'}
                      nameKey={data.categoryDistribution ? 'name' : 'category'}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(data.categoryStats || data.categoryDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#F8FAFC' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Charts Row 2: Attendance Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Attendance Present vs Absent Chart */}
            <Card className="lg:col-span-2 p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-100">Attendance Status Breakdown</h3>
                <p className="text-xs text-slate-400">Tracking present vs absent student turnouts</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.attendanceByEvent || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#F8FAFC' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#F43F5E" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Popular Events Leaderboard */}
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Top Popular Events</h3>
                <p className="text-xs text-slate-400">Ranked by total student registrations</p>
              </div>

              <div className="space-y-3">
                {(data.popularEvents || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No popular events data available.</p>
                ) : (
                  (data.popularEvents || []).map((evt, index) => {
                    const fill = Math.round(((evt.registeredCount || 0) / (evt.maxSeats || 50)) * 100);
                    return (
                      <div key={evt.id || index} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-100 truncate max-w-[160px]">{evt.title}</span>
                          <Badge variant="blue">{evt.registeredCount || 0} Enrolled</Badge>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, fill)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
