import React from 'react';

export default function EmptyState({
  title = 'No Items Found',
  description = 'There are currently no items matching your criteria.',
  action,
  icon: Icon,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 my-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/50">
        {Icon ? (
          <Icon className="w-8 h-8" />
        ) : (
          <svg className="w-8 h-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
