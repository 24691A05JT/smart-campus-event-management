import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getEventParticipantsApi, markAttendanceApi } from '../services/api';

export default function EventParticipantsPage() {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    presentCount: 0,
    absentCount: 0,
    unmarkedCount: 0,
    attendanceRate: 0,
  });
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingMap, setActionLoadingMap] = useState({});
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchParticipants();
  }, [eventId]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEventParticipantsApi(eventId);
      if (res.success) {
        setEventData(res.event);
        setStats(res.stats || {});
        setParticipants(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load event participants');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    setActionLoadingMap((prev) => ({ ...prev, [studentId]: true }));
    setFeedback(null);
    try {
      const res = await markAttendanceApi(eventId, studentId, status);
      if (res.success) {
        // Update student in local state
        setParticipants((prev) =>
          prev.map((p) => {
            const sid = p.student?._id || p.student;
            if (sid === studentId) {
              return {
                ...p,
                attendanceStatus: status,
                attendanceMarkedAt: new Date().toISOString(),
              };
            }
            return p;
          })
        );

        // Recalculate stats
        setParticipants((currentParticipants) => {
          const updated = currentParticipants.map((p) => {
            const sid = p.student?._id || p.student;
            return sid === studentId ? { ...p, attendanceStatus: status } : p;
          });
          const total = updated.length;
          const present = updated.filter((r) => r.attendanceStatus === 'present').length;
          const absent = updated.filter((r) => r.attendanceStatus === 'absent').length;
          const unmarked = updated.filter((r) => !r.attendanceStatus || r.attendanceStatus === 'unmarked').length;
          setStats({
            totalRegistered: total,
            presentCount: present,
            absentCount: absent,
            unmarkedCount: unmarked,
            attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
          });
          return updated;
        });

        setFeedback({
          type: 'success',
          message: `Attendance marked as '${status.toUpperCase()}'`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to mark attendance',
      });
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [studentId]: false }));
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Filter participants based on search query & status filter
  const filteredParticipants = participants.filter((p) => {
    const student = p.student || {};
    const nameStr = (student.name || '').toLowerCase();
    const emailStr = (student.email || '').toLowerCase();
    const deptStr = (student.department || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      nameStr.includes(query) || emailStr.includes(query) || deptStr.includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'present') return p.attendanceStatus === 'present';
    if (statusFilter === 'absent') return p.attendanceStatus === 'absent';
    if (statusFilter === 'unmarked')
      return !p.attendanceStatus || p.attendanceStatus === 'unmarked';
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={eventData ? `Participants: ${eventData.title}` : 'Event Participants'}
        subtitle="Manage student registrations and digital attendance tracking for this event"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
        action={
          <Link to="/my-events">
            <Button variant="outline" size="sm">
              ← Back to My Events
            </Button>
          </Link>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState count={3} message="Fetching registered participants..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchParticipants} />
      ) : (
        <>
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col justify-between border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled</div>
              <div className="text-2xl font-bold text-slate-100 mt-2">{stats.totalRegistered || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Cap: {eventData?.maxSeats || 'Unlimited'}</div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-emerald-900/40 bg-emerald-950/10">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Present</div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.presentCount || 0}</div>
              <div className="text-xs text-emerald-500/70 mt-1">Confirmed Attended</div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-rose-900/40 bg-rose-950/10">
              <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Absent</div>
              <div className="text-2xl font-bold text-rose-400 mt-2">{stats.absentCount || 0}</div>
              <div className="text-xs text-rose-500/70 mt-1">Not Attended</div>
            </Card>

            <Card className="p-4 flex flex-col justify-between border-indigo-900/40 bg-indigo-950/10">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Attendance Rate</div>
              <div className="text-2xl font-bold text-indigo-400 mt-2">{stats.attendanceRate || 0}%</div>
              <div className="text-xs text-indigo-500/70 mt-1">{stats.unmarkedCount || 0} Unmarked</div>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="w-full md:w-80">
                <Input
                  placeholder="Search by student name, email, or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Status:</span>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'present', label: 'Present Only' },
                    { value: 'absent', label: 'Absent Only' },
                    { value: 'unmarked', label: 'Unmarked Only' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Participants List */}
          {filteredParticipants.length === 0 ? (
            <EmptyState
              title="No Participants Found"
              description={
                participants.length === 0
                  ? 'No students have registered for this event yet.'
                  : 'No participants match your current search and filter criteria.'
              }
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Registration Date</th>
                      <th className="px-6 py-4">Attendance Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredParticipants.map((reg, index) => {
                      const student = reg.student || {};
                      const studentId = student._id || reg.student;
                      const isActionLoading = actionLoadingMap[studentId];

                      return (
                        <tr key={reg._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-100">{student.name || 'Unknown Student'}</div>
                            <div className="text-xs text-slate-400">{student.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="blue">{student.department || 'General'}</Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {formatDate(reg.registrationDate || reg.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            {reg.attendanceStatus === 'present' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Present ✅
                              </span>
                            ) : reg.attendanceStatus === 'absent' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                Absent ❌
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                Unmarked ⏳
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <Button
                              variant={reg.attendanceStatus === 'present' ? 'primary' : 'outline'}
                              size="xs"
                              loading={isActionLoading}
                              onClick={() => handleMarkAttendance(studentId, 'present')}
                            >
                              Present
                            </Button>
                            <Button
                              variant={reg.attendanceStatus === 'absent' ? 'danger' : 'outline'}
                              size="xs"
                              loading={isActionLoading}
                              onClick={() => handleMarkAttendance(studentId, 'absent')}
                            >
                              Absent
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
