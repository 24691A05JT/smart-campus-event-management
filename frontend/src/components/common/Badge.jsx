import React from 'react';

export function Badge({ children, variant = 'blue', className = '' }) {
  const styles = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        styles[variant] || styles.blue
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Rejected
        </span>
      );
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Completed
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Pending Approval
        </span>
      );
  }
}
