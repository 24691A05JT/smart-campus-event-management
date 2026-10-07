import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getMyRegistrationsApi, cancelRegistrationApi } from '../services/api';

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyRegistrationsApi();
      if (res.success) {
        setRegistrations(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel your registration for this event?')) return;
    try {
      await cancelRegistrationApi(eventId);
      setRegistrations((prev) => prev.filter((r) => r.event?._id !== eventId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration');
    }
  };

  const formatDate = (dateStr) => {
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
        title="My Registered Events"
        subtitle="Manage your active event registrations, schedule, and attendance status"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )}
      />

      {loading ? (
        <LoadingState count={3} message="Loading your event registrations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRegistrations} />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No Registered Events Yet"
          description="You have not enrolled in any campus events yet. Explore upcoming activities to get started!"
          action={
            <Link to="/events">
              <Button variant="primary" size="sm">
                Explore Campus Events
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registrations.map((reg) => {
            const evt = reg.event;
            if (!evt) return null;

            return (
              <Card key={reg._id} hover className="flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">{evt.category || 'General'}</Badge>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        reg.attendanceStatus === 'present'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : reg.attendanceStatus === 'absent'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {reg.attendanceStatus === 'present'
                        ? 'Present ✅'
                        : reg.attendanceStatus === 'absent'
                        ? 'Absent ❌'
                        : 'Registered 📌'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 line-clamp-2">{evt.title}</h3>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span>📅</span>
                      <span>{formatDate(evt.date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>⏰</span>
                      <span>{evt.startTime} - {evt.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>📍</span>
                      <span className="truncate">{evt.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400 pt-1">
                      <span>👤</span>
                      <span className="truncate">Organized by {evt.organizer?.name || 'Faculty'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center space-x-2">
                  <Link to={`/events/${evt._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Event
                    </Button>
                  </Link>

                  {reg.attendanceStatus === 'present' ? (
                    <Link to="/certificates" className="flex-1">
                      <Button variant="primary" size="sm" className="w-full text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-none shadow-md">
                        🎓 Certificate
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      onClick={() => handleCancel(evt._id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
