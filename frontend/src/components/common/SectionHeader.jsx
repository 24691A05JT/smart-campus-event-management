import React from 'react';
import { Link } from 'react-router-dom';

export default function SectionHeader({ title, subtitle, actionText, actionLink, onActionClick }) {
  return (
    <div className="flex items-end justify-between mb-6 pb-2 border-b border-slate-800/60">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      {actionText && actionLink && (
        <Link
          to={actionLink}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center space-x-1 shrink-0"
        >
          <span>{actionText}</span>
          <span>→</span>
        </Link>
      )}

      {actionText && !actionLink && onActionClick && (
        <button
          onClick={onActionClick}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center space-x-1 shrink-0"
        >
          <span>{actionText}</span>
          <span>→</span>
        </button>
      )}
    </div>
  );
}
