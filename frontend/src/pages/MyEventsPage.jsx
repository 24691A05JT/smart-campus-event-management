import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import EventCard from '../components/common/EventCard';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { getMyEventsApi, deleteEventApi } from '../services/api';

export default function MyEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetEventId, setTargetEventId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEventsApi();
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const promptDelete = (id) => {
    setTargetEventId(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!targetEventId) return;
    setDeleting(true);
    try {
      await deleteEventApi(targetEventId);
      setEvents((prev) => prev.filter((e) => e._id !== targetEventId));
      setDeleteModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
      setTargetEventId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Organized Events"
        subtitle="Manage and track status for events created under your organizer account"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
        action={
          <Link to="/create-event">
            <Button variant="primary" size="md">
              Create New Event ➕
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingState count={3} message="Loading your events..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMyEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No Events Created Yet"
          description="You haven't submitted any events. Start by creating a new campus activity!"
          action={
            <Link to="/create-event">
              <Button variant="primary" size="sm">
                Create First Event
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <EventCard
              key={evt._id}
              event={evt}
              showStatus
              action={
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                  <Link to={`/events/${evt._id}/participants`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      Participants 👥
                    </Button>
                  </Link>
                  <Link to={`/events/${evt._id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    onClick={() => promptDelete(evt._id)}
                  >
                    🗑️
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Event Deletion"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={confirmDelete}>
              Delete Event
            </Button>
          </>
        }
      >
        <p>Are you sure you want to permanently delete this event? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
