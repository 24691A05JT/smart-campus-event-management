import React from 'react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to fetch data from the server. Please check your connection and try again.',
  onRetry,
}) {
  return (
    <div className="p-6 rounded-2xl bg-red-950/30 border border-red-800/40 text-left my-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-300">{title}</h4>
          <p className="text-xs text-red-300/80 mt-0.5 leading-relaxed">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <Button size="sm" variant="dangerOutline" onClick={onRetry}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
