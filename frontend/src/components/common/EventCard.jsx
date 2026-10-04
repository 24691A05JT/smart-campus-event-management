import React from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';
import { Badge, StatusBadge } from './Badge';

export default function EventCard({ event, showStatus = false, action = null }) {
  if (!event) return null;

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
    <Card hover className="flex flex-col justify-between h-full group">
      <div>
        {/* Banner / Poster Placeholder if available */}
        {event.bannerUrl ? (
          <div className="h-40 -mx-6 -mt-6 mb-4 rounded-t-2xl overflow-hidden bg-slate-800">
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          </div>
        ) : (
          <div className="h-28 -mx-6 -mt-6 mb-4 rounded-t-2xl bg-gradient-to-tr from-slate-900 via-blue-950/40 to-slate-900 border-b border-slate-800 p-4 flex items-end justify-between">
            <Badge variant="indigo">{event.category || 'General'}</Badge>
            {showStatus && <StatusBadge status={event.status} />}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          {!event.bannerUrl && showStatus && <StatusBadge status={event.status} />}
          {event.bannerUrl && <Badge variant="indigo">{event.category}</Badge>}
        </div>

        <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition leading-snug line-clamp-2">
          {event.title}
        </h3>

        <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
          {event.description}
        </p>

        {/* Metadata Details */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(event.date)} • {event.startTime} - {event.endTime}</span>
          </div>

          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.venue}</span>
          </div>

          <div className="flex items-center justify-between pt-1 text-slate-400">
            <span className="truncate">By {event.organizer?.name || 'Faculty Organizer'}</span>
            <span className="font-semibold text-slate-200 shrink-0">{event.maxSeats || event.registrationLimit || 0} Seats</span>
          </div>
        </div>
      </div>

      {/* Card Action */}
      <div className="mt-5 pt-3">
        {action ? (
          action
        ) : (
          <Link
            to={`/events/${event._id}`}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1 transition"
          >
            <span>View Details</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </Card>
  );
}
