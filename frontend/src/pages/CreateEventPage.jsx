import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import { createEventApi } from '../services/api';

export default function CreateEventPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    venue: '',
    date: '',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    registrationLimit: 50,
    targetDepartments: 'All',
    bannerUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const categories = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        venue: formData.venue.trim(),
        registrationLimit: Number(formData.registrationLimit),
        targetDepartments: formData.targetDepartments
          ? formData.targetDepartments.split(',').map((d) => d.trim()).filter(Boolean)
          : ['All'],
        bannerUrl: formData.bannerUrl.trim(),
      };

      const res = await createEventApi(payload);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/my-events'), 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create event';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create New Campus Event"
        subtitle="Fill in event information and schedule to submit for administrator approval"
        icon={(props) => (
          <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start space-x-2">
          <span>⚠️</span>
          <div>
            <p className="font-semibold">Creation Error</p>
            <p className="mt-0.5 text-red-300/90">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center space-x-2">
          <span>✅</span>
          <p className="font-semibold">Event created successfully! Redirecting to My Events...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Event Basic Information */}
        <Card padding="p-6" className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            1. Basic Information
          </h3>

          <Input
            label="Event Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Annual Hackathon 2026 / Robotics Workshop"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a detailed description of the event agenda, rules, and outcomes..."
              required
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={categories}
            required
          />
        </Card>

        {/* Section 2: Schedule & Venue */}
        <Card padding="p-6" className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            2. Schedule & Venue
          </h3>

          <Input
            label="Venue Location"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            placeholder="e.g., Main Auditorium / Computer Lab 3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Event Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />

            <Input
              label="Start Time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              placeholder="10:00 AM"
              required
            />

            <Input
              label="End Time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              placeholder="12:00 PM"
              required
            />
          </div>
        </Card>

        {/* Section 3: Participation Settings */}
        <Card padding="p-6" className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            3. Capacity & Eligibility
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registration Seat Limit"
              type="number"
              name="registrationLimit"
              min={1}
              value={formData.registrationLimit}
              onChange={handleChange}
              required
            />

            <Input
              label="Target Departments"
              name="targetDepartments"
              value={formData.targetDepartments}
              onChange={handleChange}
              placeholder="e.g., CSE, ECE or All"
              helperText="Comma separated department codes"
            />
          </div>

          <Input
            label="Poster / Banner Image URL (Optional)"
            name="bannerUrl"
            value={formData.bannerUrl}
            onChange={handleChange}
            placeholder="https://images.unsplash.com/photo-..."
          />
        </Card>

        {/* Form Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <Button type="submit" variant="primary" size="lg" loading={loading} className="flex-1">
            Submit Event for Approval
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/my-events')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
