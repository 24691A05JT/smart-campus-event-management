import React from 'react';

export default function LoadingState({ count = 3, message = 'Loading content...' }) {
  return (
    <div className="space-y-4 py-6">
      <div className="flex items-center space-x-3 justify-center mb-6">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">{message}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-6 bg-slate-800 rounded w-3/4" />
            <div className="h-12 bg-slate-800/60 rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-slate-800/80 rounded w-1/2" />
              <div className="h-3 bg-slate-800/80 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
