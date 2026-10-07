import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
} from '../services/api';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getMyNotificationsApi();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for notifications periodically every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await markNotificationReadApi(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markAllNotificationsReadApi();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await deleteNotificationApi(id);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead({ stopPropagation: () => {} }, notification._id);
    }
    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'registration':
        return { label: 'Registration', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'event_approval':
        return { label: 'Approval', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'event_rejection':
        return { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'attendance':
        return { label: 'Attendance', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'certificate':
        return { label: 'Certificate', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default:
        return { label: 'General', color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition relative focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-blue-600 rounded-full border border-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60">
          {/* Panel Header */}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-950/70">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <p className="text-sm font-semibold text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-500">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => {
                const badge = getTypeBadge(n.type);

                return (
                  <div
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3.5 transition flex space-x-3 cursor-pointer group ${
                      !n.isRead ? 'bg-blue-950/20 hover:bg-blue-950/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="pt-1 shrink-0">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          !n.isRead ? 'bg-blue-500' : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatTimeAgo(n.createdAt)}</span>
                      </div>

                      <p className={`text-xs font-semibold ${!n.isRead ? 'text-slate-100' : 'text-slate-300'}`}>
                        {n.title}
                      </p>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {/* Quick Dismiss / Delete */}
                    <div className="pt-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, n._id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete notification"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-950/40 text-center">
            <span className="text-[11px] text-slate-500">Notifications update in real time</span>
          </div>
        </div>
      )}
    </div>
  );
}
