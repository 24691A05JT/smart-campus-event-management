import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getAllEventsApi, approveEventApi, rejectEventApi } from '../services/api';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetEventId, setTargetEventId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllEventsApi();
      if (res.success) {
        setEvents(res.data || []);
      } else {
        setError(res.message || 'Failed to load campus events');
      }
    } catch (err) {
      console.error('Error fetching all events for admin:', err);
      setError(err.response?.data?.message || 'Error connecting to server to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveEventApi(id);
      setEvents((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: 'approved', rejectionReason: '' } : e))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve event');
    }
  };

  const openRejectModal = (id) => {
    setTargetEventId(id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!targetEventId) return;
    setProcessing(true);
    try {
      const reason = rejectionReason.trim() || 'Rejected by Administrator';
      await rejectEventApi(targetEventId, reason);
      setEvents((prev) =>
        prev.map((e) => (e._id === targetEventId ? { ...e, status: 'rejected', rejectionReason: reason } : e))
      );
      setRejectModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject event');
    } finally {
      setProcessing(false);
      setTargetEventId(null);
    }
  };

  // Filter events client side for responsiveness
  const filteredEvents = events.filter((evt) => {
    if (statusFilter && evt.status !== statusFilter) return false;
    if (categoryFilter && evt.category !== categoryFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matchTitle = evt.title?.toLowerCase().includes(term);
      const matchVenue = evt.venue?.toLowerCase().includes(term);
      const matchOrg = evt.organizer?.name?.toLowerCase().includes(term);
      return matchTitle || matchVenue || matchOrg;
    }
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadges = {
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="Campus Events Management & Moderation"
        subtitle="Master oversight of all campus-wide student and faculty events, approvals, and schedules"
      />

      {/* Filter Bar */}
      <Card className="p-5 bg-slate-900/90 border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Search Events"
            name="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event title, venue, organizer..."
          />

          <Select
            label="Status Filter"
            name="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses (Approved, Pending, Rejected)' },
              { value: 'approved', label: 'Approved Events' },
              { value: 'pending', label: 'Pending Approval' },
              { value: 'rejected', label: 'Rejected Submissions' },
            ]}
          />

          <Select
            label="Category Filter"
            name="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'Technical', label: 'Technical' },
              { value: 'Cultural', label: 'Cultural' },
              { value: 'Sports', label: 'Sports' },
              { value: 'Workshop', label: 'Workshop' },
              { value: 'Seminar', label: 'Seminar' },
            ]}
          />
        </div>
      </Card>

      {/* Events List */}
      {loading ? (
        <LoadingState count={4} message="Fetching campus event directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="No campus events matched your search or status filter criteria."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-400">
              Showing <strong className="text-white">{filteredEvents.length}</strong> events
            </span>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((evt) => (
              <Card key={evt._id} hover className="p-6 bg-slate-900/90 border-slate-800 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="blue">{evt.category || 'General'}</Badge>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          statusBadges[evt.status] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evt.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        Organizer: <strong className="text-slate-200">{evt.organizer?.name || 'Faculty'}</strong> ({evt.organizer?.department || 'Campus'})
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">{evt.title}</h3>
                    <p className="text-xs text-slate-300 line-clamp-2">{evt.description}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60 mt-3">
                      <span>📍 <strong className="text-slate-300">{evt.venue}</strong></span>
                      <span>📅 <strong className="text-slate-300">{formatDate(evt.date)}</strong></span>
                      <span>⏰ <strong className="text-slate-300">{evt.startTime} - {evt.endTime}</strong></span>
                      <span>👥 <strong className="text-blue-400">{evt.registeredCount || 0} / {evt.maxSeats} Registered</strong></span>
                    </div>

                    {evt.status === 'rejected' && evt.rejectionReason && (
                      <p className="text-xs text-rose-400 bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/40 mt-2">
                        Rejection reason: {evt.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <Link to={`/events/${evt._id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Event
                      </Button>
                    </Link>

                    {evt.status === 'pending' && (
                      <>
                        <Button variant="success" size="sm" className="text-xs" onClick={() => handleApprove(evt._id)}>
                          Approve ✅
                        </Button>
                        <Button variant="dangerOutline" size="sm" className="text-xs" onClick={() => openRejectModal(evt._id)}>
                          Reject ❌
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Event Submission"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={processing} onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Please provide an optional reason for rejecting this event proposal. The organizer will be notified.
          </p>
          <Input
            label="Rejection Reason"
            name="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Venue schedule conflict or incomplete event description."
          />
        </div>
      </Modal>
    </div>
  );
}
