import React, { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import EventCard from '../components/common/EventCard';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getApprovedEventsApi } from '../services/api';

export default function BrowseEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    department: '',
    date: '',
  });

  const categories = [
    { label: 'All Categories', value: '' },
    { label: 'Technical', value: 'Technical' },
    { label: 'Cultural', value: 'Cultural' },
    { label: 'Sports', value: 'Sports' },
    { label: 'Workshop', value: 'Workshop' },
    { label: 'Seminar', value: 'Seminar' },
  ];

  const departments = [
    { label: 'All Departments', value: '' },
    { label: 'CSE', value: 'CSE' },
    { label: 'ECE', value: 'ECE' },
    { label: 'ME', value: 'ME' },
    { label: 'EEE', value: 'EEE' },
    { label: 'MBA', value: 'MBA' },
    { label: 'Civil', value: 'Civil' },
    { label: 'IT', value: 'IT' },
    { label: 'AI&DS', value: 'AI&DS' },
  ];

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {};
      if (filters.search.trim()) queryParams.search = filters.search.trim();
      if (filters.category) queryParams.category = filters.category;
      if (filters.department) queryParams.department = filters.department;
      if (filters.date) queryParams.date = filters.date;

      const res = await getApprovedEventsApi(queryParams);
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load approved events');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', department: '', date: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore Campus Events"
        subtitle="Discover workshops, hackathons, cultural fests, and sports activities happening across campus"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      />

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search by title, venue..."
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
          />

          <Select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            options={categories}
          />

          <Select
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
            options={departments}
          />

          <Input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />
        </div>

        {(filters.search || filters.category || filters.department || filters.date) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400">
              Showing filtered results ({events.length} events found)
            </span>
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 font-semibold transition"
            >
              Reset Filters 🔄
            </button>
          </div>
        )}
      </div>

      {/* Events Grid / State Views */}
      {loading ? (
        <LoadingState count={6} message="Searching campus events..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="We couldn't find any approved events matching your selected filters."
          action={
            (filters.search || filters.category || filters.department || filters.date) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Clear Filters
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <EventCard key={evt._id} event={evt} />
          ))}
        </div>
      )}
    </div>
  );
}
