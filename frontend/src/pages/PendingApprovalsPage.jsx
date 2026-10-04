import React, { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { getPendingEventsApi, approveEventApi, rejectEventApi } from '../services/api';

export default function PendingApprovalsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetEventId, setTargetEventId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingEventsApi();
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveEventApi(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
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
      await rejectEventApi(targetEventId, rejectionReason.trim());
      setEvents((prev) => prev.filter((e) => e._id !== targetEventId));
      setRejectModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject event');
    } finally {
      setProcessing(false);
      setTargetEventId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Approvals & Moderation"
        subtitle="Review, approve, or reject campus event submissions from faculty and organizers"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      />

      {loading ? (
        <LoadingState count={3} message="Fetching pending approval requests..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPendingEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="All Caught Up!"
          description="There are currently no pending event approval requests requiring moderation."
        />
      ) : (
        <div className="space-y-4">
          {events.map((evt) => (
            <Card key={evt._id} padding="p-6" className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="indigo">{evt.category}</Badge>
                    <span className="text-xs text-slate-400">
                      Submitted by: <strong className="text-slate-200">{evt.organizer?.name || 'Organizer'}</strong> ({evt.organizer?.department || 'Faculty'})
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-100">{evt.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{evt.description}</p>

                  <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400 border-t border-slate-800/60 mt-3">
                    <span className="flex items-center space-x-1">
                      <span>📍</span>
                      <strong className="text-slate-300">{evt.venue}</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>📅</span>
                      <strong className="text-slate-300">{new Date(evt.date).toLocaleDateString()}</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>⏰</span>
                      <strong className="text-slate-300">{evt.startTime} - {evt.endTime}</strong>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>👥</span>
                      <strong className="text-slate-300">{evt.maxSeats || evt.registrationLimit} Capacity</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <Button variant="success" size="md" onClick={() => handleApprove(evt._id)}>
                    Approve ✅
                  </Button>
                  <Button variant="dangerOutline" size="md" onClick={() => openRejectModal(evt._id)}>
                    Reject ❌
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Clean Rejection Modal */}
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
            Please provide an optional reason for rejecting this event request. The organizer will see this feedback.
          </p>
          <Input
            label="Rejection Reason (Optional)"
            name="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g., Venue already reserved for official campus ceremony."
          />
        </div>
      </Modal>
    </div>
  );
}
