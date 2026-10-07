import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { getMyCertificatesApi, downloadCertificatePdfBlob } from '../services/api';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyCertificatesApi();
      if (res.success) {
        setCertificates(res.data || []);
      } else {
        setError(res.message || 'Failed to load certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError(err.response?.data?.message || 'Error connecting to server to load certificates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (cert) => {
    const certId = cert.certificateId || cert._id;
    try {
      setDownloadingId(certId);
      const blob = await downloadCertificatePdfBlob(certId);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${cert.certificateId || 'event'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.response?.data?.message || 'Failed to download certificate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewOnline = async (cert) => {
    const certId = cert.certificateId || cert._id;
    try {
      setDownloadingId(certId);
      const blob = await downloadCertificatePdfBlob(certId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to open certificate preview');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="My Certificates"
        subtitle="View, preview, and download your official verified event participation certificates"
      />

      {loading ? (
        <LoadingState message="Loading your earned certificates..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCertificates} />
      ) : certificates.length === 0 ? (
        <EmptyState
          title="No Certificates Earned Yet"
          description="No certificates yet. Attend eligible events to earn certificates."
          icon={
            <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => {
            const event = cert.event || {};
            const isDownloading = downloadingId === (cert.certificateId || cert._id);

            return (
              <Card key={cert._id} hover className="flex flex-col justify-between p-6 space-y-5 border-slate-800 bg-slate-900/80">
                <div className="space-y-4">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between">
                    <Badge variant="blue">{event.category || 'General'}</Badge>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified ✓
                    </span>
                  </div>

                  {/* Event Title */}
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight line-clamp-2">
                      {event.title || 'Campus Event'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Organized by: <span className="text-slate-300 font-medium">{event.organizer?.name || 'Faculty Organizer'}</span>
                    </p>
                  </div>

                  {/* Certificate Key Details */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Certificate ID:</span>
                      <span className="font-mono text-blue-400 font-bold">{cert.certificateId}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Issued Date:</span>
                      <span className="text-slate-200">{formatDate(cert.issueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Event Date:</span>
                      <span className="text-slate-200">{formatDate(event.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => handleViewOnline(cert)}
                    disabled={isDownloading}
                  >
                    View
                  </Button>

                  <Button
                    variant="primary"
                    className="flex-1 text-xs"
                    onClick={() => handleDownload(cert)}
                    loading={isDownloading}
                  >
                    {isDownloading ? 'Preparing...' : 'Download'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
