import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getAdminUsersApi } from '../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter) params.role = roleFilter;

      const res = await getAdminUsersApi(params);
      if (res.success) {
        setUsers(res.data || []);
      } else {
        setError(res.message || 'Failed to load user directory');
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setError(err.response?.data?.message || 'Error connecting to server for user management.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const roleStyles = {
    student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    organizer: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="User Administration Console"
        subtitle="Manage student, faculty organizer, and administrator user accounts across departments"
      />

      {/* Filter and Search Bar */}
      <Card className="p-5 bg-slate-900/90 border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              label="Search User"
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or email..."
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              label="Filter by Role"
              name="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: '', label: 'All Roles (Students, Organizers, Admins)' },
                { value: 'student', label: 'Students' },
                { value: 'organizer', label: 'Faculty / Organizers' },
                { value: 'admin', label: 'Administrators' },
              ]}
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/20"
          >
            Filter Directory
          </button>
        </form>
      </Card>

      {/* Users List Area */}
      {loading ? (
        <LoadingState count={4} message="Fetching user directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          description="No user accounts matched your search or role filter criteria."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-400">
              Showing <strong className="text-white">{users.length}</strong> registered accounts
            </span>
          </div>

          {/* Desktop Table / Card View */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-6">User Name</th>
                    <th className="py-3.5 px-6">Email Address</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Department</th>
                    <th className="py-3.5 px-6">Joined Date</th>
                    <th className="py-3.5 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-800/40 transition">
                      {/* Name */}
                      <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                          {u.name ? u.name.charAt(0) : 'U'}
                        </div>
                        <span className="truncate max-w-[160px]">{u.name}</span>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-slate-300 font-mono text-xs">{u.email}</td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            roleStyles[u.role] || 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6 text-slate-300">{u.department || 'N/A'}</td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-slate-400">{formatDate(u.createdAt)}</td>

                      {/* Status */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active ✓
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
