import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smart_campus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global 401 token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid or expired token
      localStorage.removeItem('smart_campus_token');
    }
    return Promise.reject(error);
  }
);

// API Service Calls
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Event API Calls
export const getApprovedEventsApi = async (params = {}) => {
  const response = await api.get('/events', { params });
  return response.data;
};

export const getMyEventsApi = async () => {
  const response = await api.get('/events/my');
  return response.data;
};

export const getPendingEventsApi = async () => {
  const response = await api.get('/events/pending');
  return response.data;
};

export const getEventByIdApi = async (id) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

export const createEventApi = async (eventData) => {
  const response = await api.post('/events', eventData);
  return response.data;
};

export const updateEventApi = async (id, eventData) => {
  const response = await api.put(`/events/${id}`, eventData);
  return response.data;
};

export const deleteEventApi = async (id) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};

export const approveEventApi = async (id) => {
  const response = await api.put(`/events/${id}/approve`);
  return response.data;
};

export const rejectEventApi = async (id, rejectionReason = '') => {
  const response = await api.put(`/events/${id}/reject`, { rejectionReason });
  return response.data;
};

// Registration API Calls
export const registerForEventApi = async (eventId) => {
  const response = await api.post(`/registrations/${eventId}`);
  return response.data;
};

export const getMyRegistrationsApi = async () => {
  const response = await api.get('/registrations/my');
  return response.data;
};

export const checkRegistrationStatusApi = async (eventId) => {
  const response = await api.get(`/registrations/check/${eventId}`);
  return response.data;
};

export const cancelRegistrationApi = async (eventId) => {
  const response = await api.delete(`/registrations/${eventId}`);
  return response.data;
};

// Attendance API Calls (Organizer/Admin)
export const getEventParticipantsApi = async (eventId) => {
  const response = await api.get(`/attendance/event/${eventId}`);
  return response.data;
};

export const markAttendanceApi = async (eventId, studentId, status) => {
  const response = await api.put(`/attendance/${eventId}/${studentId}`, { status });
  return response.data;
};

// Feedback API Calls
export const submitFeedbackApi = async (eventId, feedbackData) => {
  const response = await api.post(`/feedback/${eventId}`, feedbackData);
  return response.data;
};

export const getEventFeedbackApi = async (eventId) => {
  const response = await api.get(`/feedback/event/${eventId}`);
  return response.data;
};

export const getMyFeedbackApi = async () => {
  const response = await api.get('/feedback/my');
  return response.data;
};

// Recommendation API Calls
export const getRecommendationsApi = async () => {
  const response = await api.get('/recommendations');
  return response.data;
};

// Analytics API Calls (Organizer/Admin)
export const getOrganizerAnalyticsApi = async () => {
  const response = await api.get('/analytics/organizer');
  return response.data;
};

export const getAdminAnalyticsApi = async () => {
  const response = await api.get('/analytics/admin');
  return response.data;
};

export const getAnalyticsApi = async () => {
  const response = await api.get('/analytics');
  return response.data;
};

// Certificate API Calls
export const generateCertificateApi = async (eventId) => {
  const response = await api.post(`/certificates/${eventId}/generate`);
  return response.data;
};

export const getMyCertificatesApi = async () => {
  const response = await api.get('/certificates/my');
  return response.data;
};

export const getCertificateByIdApi = async (certificateId) => {
  const response = await api.get(`/certificates/${certificateId}`);
  return response.data;
};

export const downloadCertificatePdfBlob = async (certificateId) => {
  const response = await api.get(`/certificates/${certificateId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

// Notification API Calls
export const getMyNotificationsApi = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationReadApi = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsReadApi = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotificationApi = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

// Admin Management API Calls
export const getAllEventsApi = async (params = {}) => {
  const response = await api.get('/events/all', { params });
  return response.data;
};

export const getAdminUsersApi = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export default api;
