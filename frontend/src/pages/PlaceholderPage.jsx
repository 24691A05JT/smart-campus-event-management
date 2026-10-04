import React from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title, subtitle, icon: Icon, featureName }) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title={title} subtitle={subtitle} icon={Icon} />

      <Card padding="p-12" className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-100">{featureName || title} Feature Integrated</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          This portal module is connected to the Smart Campus architecture. Live registration and analytics features will populate as data accumulates.
        </p>

        <div className="pt-4">
          <Link to="/">
            <Button variant="primary" size="sm">Return to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
