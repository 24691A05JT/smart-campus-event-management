import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getRecommendationsApi, registerForEventApi } from '../services/api';

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeringId, setRegisteringId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecommendationsApi();
      if (res.success) {
        setRecommendations(res.data || res.recommendations || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId) => {
    setRegisteringId(eventId);
    setFeedbackMsg(null);
    try {
      const res = await registerForEventApi(eventId);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          message: 'Enrolled successfully! View it in My Registrations.',
        });
        // Remove registered event from active recommendations
        setRecommendations((prev) => prev.filter((item) => (item.event?._id || item.event) !== eventId));
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        message: err.response?.data?.message || 'Registration failed',
      });
    } finally {
      setRegisteringId(null);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
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
        title="Recommended For You"
        subtitle="AI-powered recommendations calculated from your department, interests, past activity, and campus popularity"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )}
      />

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="font-medium">{feedbackMsg.message}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState count={3} message="Calculating personalized event recommendations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRecommendations} />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No Match Recommendations Found"
          description="We couldn't find new upcoming events matching your profile right now. Browse all campus events to explore more!"
          action={
            <Link to="/events">
              <Button variant="primary" size="sm">
                Browse All Campus Events
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((item, index) => {
            const evt = item.event;
            if (!evt) return null;
            const eventId = evt._id;
            const isRegistering = registeringId === eventId;

            return (
              <Card key={eventId || index} hover className="flex flex-col justify-between h-full border-slate-800">
                <div className="space-y-4">
                  {/* Category & Score Header */}
                  <div className="flex items-center justify-between">
                    <Badge variant="indigo">{evt.category || 'General'}</Badge>
                    <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                      <span>⚡</span>
                      <span>Score: {item.score}/100</span>
                    </div>
                  </div>

                  {/* Title & Banner Image */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {evt.title}
                    </h3>
                    {evt.bannerUrl && (
                      <img
                        src={evt.bannerUrl}
                        alt={evt.title}
                        className="w-full h-36 object-cover rounded-lg mt-3 border border-slate-800"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>

                  {/* Why Recommended Explanation Box */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-indigo-500/20 text-xs text-indigo-200/90 space-y-1">
                    <div className="font-semibold flex items-center space-x-1.5 text-indigo-400">
                      <span>💡</span>
                      <span>Why Recommended</span>
                    </div>
                    <p className="leading-relaxed text-slate-300">{item.reason}</p>
                  </div>

                  {/* Event Metadata */}
                  <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
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

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center space-x-3">
                  <Link to={`/events/${eventId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isRegistering}
                    onClick={() => handleRegister(eventId)}
                    className="flex-1"
                  >
                    Register Now
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
