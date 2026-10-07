import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import BrowseEventsPage from './pages/BrowseEventsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyEventsPage from './pages/MyEventsPage';
import CreateEventPage from './pages/CreateEventPage';
import PendingApprovalsPage from './pages/PendingApprovalsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import MyRegistrationsPage from './pages/MyRegistrationsPage';
import EventParticipantsPage from './pages/EventParticipantsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import CertificatesPage from './pages/CertificatesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="events" element={<BrowseEventsPage />} />
            <Route path="events/:id" element={<EventDetailsPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

            {/* Student Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student', 'admin']} />}>
              <Route path="my-registrations" element={<MyRegistrationsPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
            </Route>

            {/* Organizer Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['organizer', 'admin']} />}>
              <Route path="my-events" element={<MyEventsPage />} />
              <Route path="create-event" element={<CreateEventPage />} />
              <Route path="events/:eventId/participants" element={<EventParticipantsPage />} />
            </Route>

            {/* Shared Analytics Route */}
            <Route element={<ProtectedRoute allowedRoles={['organizer', 'admin']} />}>
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="pending-approvals" element={<PendingApprovalsPage />} />
              <Route path="all-events" element={<BrowseEventsPage />} />
              <Route
                path="users"
                element={
                  <PlaceholderPage
                    title="User Administration"
                    subtitle="Campus student, faculty, and administrator account management"
                    featureName="User Management Console"
                  />
                }
              />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
