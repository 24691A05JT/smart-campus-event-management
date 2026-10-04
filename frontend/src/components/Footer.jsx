import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs space-y-2">
        <p className="text-slate-300 font-medium">
          🎓 Smart Campus Event & Activity Management System
        </p>
        <p className="text-slate-500">
          Powered by React, Express, Node.js, and MongoDB Atlas • Role-Based Access Control (RBAC) Enabled
        </p>
      </div>
    </footer>
  );
}
