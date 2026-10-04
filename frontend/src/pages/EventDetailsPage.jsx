import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/common/Card';
import { Badge, StatusBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import {
  getEventByIdApi,
  registerForEventApi,
  checkRegistrationStatusApi,
  submitFeedbackApi,
  getEventFeedbackApi,
} from '../services/api';

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regSuccessMsg, setRegSuccessMsg] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [id, isAuthenticated, user]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEventByIdApi(id);
      if (res.success) {
        setEvent(res.data);
      }

      // If user is logged-in student, check registration status
      if (isAuthenticated && user?.role === 'student') {
        try {
          const checkRes = await checkRegistrationStatusApi(id);
          if (checkRes.success) {
            setIsRegistered(checkRes.isRegistered);
          }
        } catch (checkErr) {
          // Non-blocking check
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Event not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setRegistering(true);
    setRegError(null);
    setRegSuccessMsg(null);

    try {
      const res = await registerForEventApi(id);
      if (res.success) {
        setIsRegistered(true);
        setRegSuccessMsg('Registration successful! You are enrolled for this event.');
        // Update local registeredCount
        setEvent((prev) => (prev ? { ...prev, registeredCount: (prev.registeredCount || 0) + 1 } : prev));
      }
    } catch (err) {
      setRegError(err.response?.data?.message || err.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return <LoadingState count={1} message="Loading event details..." />;
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState
          title="Event Unavailable"
          message={error || 'The requested event could not be found or is awaiting admin approval.'}
          onRetry={fetchEventDetails}
        />
        <div className="text-center mt-4">
          <Link to="/">
            <Button variant="outline" size="sm">← Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOrganizerOwner =
    user && event.organizer && (event.organizer._id === user._id || event.organizer === user._id);
  const isAdmin = user && user.role === 'admin';
  const isStudent = user && user.role === 'student';

  const maxSeats = event.maxSeats || event.registrationLimit || 0;
  const currentCount = event.registeredCount || 0;
  const isFull = currentCount >= maxSeats;

  const renderRegistrationAction = () => {
    if (isOrganizerOwner || isAdmin) {
      return (
        <Link to="/my-events">
          <Button variant="secondary" size="md">Manage Event ⚙️</Button>
        </Link>
      );
    }

    if (!isAuthenticated) {
      return (
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/login', { state: { from: location } })}
        >
          Sign In to Register ✨
        </Button>
      );
    }

    if (isStudent) {
      if (isRegistered) {
        return (
          <div className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm">
            <span>✅</span>
            <span>Already Registered</span>
          </div>
        );
      }

      if (isFull) {
        return (
          <Button variant="secondary" size="lg" disabled>
            Registration Full 🔒
          </Button>
        );
      }

      return (
        <Button
          variant="primary"
          size="lg"
          loading={registering}
          onClick={handleRegister}
        >
          Register Now ✨
        </Button>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1"
      >
        <span>← Back</span>
      </button>

      {/* Hero Header Card */}
      <Card padding="p-0" className="overflow-hidden">
        {event.bannerUrl ? (
          <div className="h-64 sm:h-80 w-full overflow-hidden bg-slate-800 relative">
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          </div>
        ) : (
          <div className="h-44 w-full bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 p-8 flex items-end justify-between border-b border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-3">
              <Badge variant="indigo" className="text-sm px-3 py-1">{event.category}</Badge>
              <StatusBadge status={event.status} />
            </div>
          </div>
        )}

        <div className="p-6 sm:p-8 space-y-6">
          {regSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center space-x-2">
              <span>🎉</span>
              <span className="font-semibold">{regSuccessMsg}</span>
            </div>
          )}

          {regError && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center space-x-2">
              <span>⚠️</span>
              <span className="font-semibold">{regError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Badge variant="blue">{event.category}</Badge>
                <StatusBadge status={event.status} />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-snug">
                {event.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 flex items-center space-x-2">
                <span>Organized by</span>
                <strong className="text-slate-200">{event.organizer?.name || 'Faculty Organizer'}</strong>
                {event.organizer?.department && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    {event.organizer.department}
                  </span>
                )}
              </p>
            </div>

            {/* Registration Action */}
            <div className="shrink-0">{renderRegistrationAction()}</div>
          </div>

          {/* Key Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">{formatDate(event.date)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Time Slot</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5">{event.startTime} - {event.endTime}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Venue</p>
              <p className="text-sm font-bold text-slate-100 mt-0.5 truncate">{event.venue}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Seats</p>
              <p className="text-sm font-bold text-blue-400 mt-0.5">
                {currentCount} / {maxSeats} Registered
              </p>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">About This Event</h3>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
              {event.description}
            </div>
          </div>

          {/* Target Department Eligibility */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Eligible Departments</h3>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(event.targetDepartments) ? (
                event.targetDepartments.map((dept) => (
                  <Badge key={dept} variant="slate" className="text-xs px-3 py-1">
                    {dept}
                  </Badge>
                ))
              ) : (
                <Badge variant="slate" className="text-xs px-3 py-1">{event.targetDepartments}</Badge>
              )}
            </div>
          </div>

          {/* Feedback & Ratings Section */}
          <FeedbackSection
            eventId={id}
            isStudent={isStudent}
            isRegistered={isRegistered}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </Card>
    </div>
  );
}

// Sub-component: Feedback & Ratings Section
function FeedbackSection({ eventId, isStudent, isRegistered, isAuthenticated }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [eventId]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await getEventFeedbackApi(eventId);
      if (res.success) {
        setFeedbacks(res.data || []);
        setAvgRating(res.averageRating || 0);
        setTotalCount(res.totalFeedbackCount || 0);
      }
    } catch (err) {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const res = await submitFeedbackApi(eventId, { rating, comments });
      if (res.success) {
        setFeedbackSuccess('Thank you! Your feedback has been submitted successfully.');
        setHasSubmitted(true);
        setComments('');
        fetchFeedback();
      }
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-6 border-t border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Student Reviews & Ratings</h3>
          <p className="text-xs text-slate-400">Feedback submitted by enrolled student participants</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
          <span className="text-xl text-amber-400">★</span>
          <span className="text-lg font-extrabold text-slate-100">{avgRating > 0 ? avgRating : 'N/A'}</span>
          <span className="text-xs text-slate-400">({totalCount} {totalCount === 1 ? 'review' : 'reviews'})</span>
        </div>
      </div>

      {/* Submit Feedback Form for Registered Student */}
      {isAuthenticated && isStudent && isRegistered && !hasSubmitted && (
        <form onSubmit={handleSubmitFeedback} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-200">Rate & Review This Event</h4>

          {feedbackSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              {feedbackSuccess}
            </div>
          )}
          {feedbackError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {feedbackError}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium">Your Rating:</span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-xl transition-transform hover:scale-110 ${
                    star <= rating ? 'text-amber-400' : 'text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-amber-400">({rating} / 5 Stars)</span>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Share your thoughts about this event (optional)..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <Button variant="primary" size="sm" loading={submitting} type="submit">
            Submit Feedback ★
          </Button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-xs text-slate-400">Loading reviews...</div>
      ) : feedbacks.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
          No feedback submitted for this event yet.
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((item) => (
            <div key={item._id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200">{item.student?.name || 'Student'}</span>
                  {item.student?.department && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.student.department}
                    </span>
                  )}
                </div>
                <div className="flex text-amber-400">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
              {item.comments && <p className="text-slate-300 text-xs">{item.comments}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
