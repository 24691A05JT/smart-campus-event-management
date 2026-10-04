import React from 'react';

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'p-6',
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl ${padding} shadow-xl shadow-slate-950/50 ${
        hover ? 'hover:border-slate-700 hover:shadow-2xl hover:shadow-blue-500/5 transition duration-200 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
