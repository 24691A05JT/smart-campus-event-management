import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';

export default function RegisterPage() {
  const { register, authError, setAuthError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'CSE',
    role: 'student',
    interests: '',
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const departments = ['CSE', 'ECE', 'ME', 'EEE', 'MBA', 'Civil', 'IT', 'AI&DS', 'Biotech', 'Other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (authError) setAuthError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.department) {
      errors.department = 'Department is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        department: formData.department.trim(),
        interests: formData.interests
          ? formData.interests.split(',').map((i) => i.trim()).filter(Boolean)
          : [],
      };

      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      // Handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-8">
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-blue-500/5">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-blue-500/25">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Create Your Account</h2>
          <p className="text-xs text-slate-400 mt-1">Join the Smart Campus event & activity management network</p>
        </div>

        {authError && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start space-x-2">
            <span className="text-sm">⚠️</span>
            <div>
              <p className="font-semibold">Registration Failed</p>
              <p className="mt-0.5 text-red-300/90">{authError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
            error={fieldErrors.name}
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="student@smartcampus.edu"
            error={fieldErrors.email}
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            error={fieldErrors.password}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              options={departments}
              required
            />

            <Select
              label="Account Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={[
                { label: 'Student', value: 'student' },
                { label: 'Faculty / Organizer', value: 'organizer' },
              ]}
              required
            />
          </div>

          <Input
            label="Interests (comma separated)"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            placeholder="Coding, Robotics, AI, Music, Sports"
            helperText="Used to recommend events matching your preferences"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            Complete Registration
          </Button>
        </form>

        <div className="mt-8 text-center pt-5 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
