import React, { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

export default function HomePage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  const fetchHealthStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealthData(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl">
            🎓
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Smart Campus Event System
            </h1>
            <p className="text-sm text-slate-400">
              Day 1 Foundation Setup & Health Check
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/50">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
              Backend Status Check (/api/health)
            </h2>
            {loading ? (
              <div className="flex items-center space-x-2 text-yellow-400">
                <span className="animate-spin">⌛</span>
                <span>Testing connection to backend API...</span>
              </div>
            ) : error ? (
              <div className="text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-800/40">
                <p className="font-medium">⚠️ Connection Failed</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Make sure the backend server is running on port 5000 using <code className="bg-slate-800 px-1 py-0.5 rounded">npm run dev</code> inside <code className="bg-slate-800 px-1 py-0.5 rounded">backend/</code> directory.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">API Status:</span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🟢 Operational
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Response Message:</span>
                  <span className="text-slate-200 font-mono text-xs">{healthData?.message}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Database Connection:</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    healthData?.database?.connected
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {healthData?.database?.connected ? '✅ Connected to MongoDB' : '⚠️ Pending Database Connection'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Server Time:</span>
                  <span className="text-slate-300 font-mono text-xs">
                    {new Date(healthData?.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-700/60 pt-4">
          <span>Tech Stack: React + Express + Tailwind + MongoDB</span>
          <button
            onClick={fetchHealthStatus}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
          >
            🔄 Re-test Backend API
          </button>
        </div>
      </div>
    </div>
  );
}
