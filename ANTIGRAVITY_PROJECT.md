# Smart Campus Event & Activity Management System
## System Documentation & Developer Guide

---

### 1. Project Overview
The **Smart Campus Event & Activity Management System with AI-Based Event Recommendation & Engagement Analytics** is a complete, full-stack web application designed for higher education institutions. It streamlines campus event creation, admin approval workflows, student event discovery and registration, digital attendance tracking, automated digital certificate generation, explainable AI event recommendations, and engagement analytics.

---

### 2. Tech Stack

#### **Frontend**
- **Framework:** React.js (Bootstrapped with Vite)
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **HTTP Client:** Axios (with custom interceptors for JWT injection)
- **Data Visualization:** Recharts

#### **Backend**
- **Runtime:** Node.js
- **Framework:** Express.js (REST API Architecture)
- **Authentication:** JWT (JSON Web Tokens) with HTTP headers
- **Password Hashing:** `bcryptjs`
- **Role-Based Access Control (RBAC):** Middleware for `Student`, `Organizer`, `Admin`

#### **Database**
- **Database:** MongoDB Atlas (Cloud Database)
- **ODM:** Mongoose

#### **Third-Party Services & Libraries**
- **Cloud Storage:** Cloudinary (For banner images & event posters)
- **PDF Generation:** PDFKit (For digital attendance certificates)
- **Email Notifications:** Nodemailer (For automated email notifications)
- **Version Control:** Git & GitHub

#### **Deployment Architecture**
- **Frontend Host:** Vercel
- **Backend Host:** Render
- **Database Host:** MongoDB Atlas

---

### 3. User Roles & Permissions

| Role | Key Capabilities |
| :--- | :--- |
| **Student** | Account creation, profile update (interests/dept), browse approved events, search/filter, view recommendations, register for events, mark feedback/ratings, download PDF certificates, view notifications. |
| **Organizer / Faculty** | Create events (with conflict detection), edit/delete own events, view registrants list, mark attendance, publish event outcomes/results, view event engagement analytics. |
| **Admin** | Master dashboard, manage all users & roles, approve/reject pending events, monitor campus-wide participation records, view feedback analytics, oversee platform health. |

---

### 4. Database Schema Design (MongoDB / Mongoose)

#### **1. User Schema (`users`)**
- `_id`: ObjectId
- `name`: String (Required)
- `email`: String (Required, Unique)
- `password`: String (Required, Hashed)
- `role`: String (Enum: `['student', 'organizer', 'admin']`, Default: `'student'`)
- `department`: String (e.g., `'CSE'`, `'ECE'`, `'ME'`, `'MBA'`)
- `interests`: `[String]` (e.g., `['Coding', 'Robotics', 'Music', 'Sports']`)
- `isApproved`: Boolean (For organizer role registration approval if needed, Default: `true` for students)
- `createdAt`: Date
- `updatedAt`: Date

#### **2. Event Schema (`events`)**
- `_id`: ObjectId
- `title`: String (Required)
- `description`: String (Required)
- `category`: String (Required, Enum: `['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar']`)
- `organizer`: ObjectId (Ref: `'User'`, Required)
- `venue`: String (Required)
- `date`: Date (Required)
- `startTime`: String (Required, e.g., `'10:00 AM'`)
- `endTime`: String (Required, e.g., `'01:00 PM'`)
- `targetDepartments`: `[String]` (e.g., `['CSE', 'ECE']` or `['All']`)
- `maxSeats`: Number (Required)
- `registeredCount`: Number (Default: `0`)
- `bannerUrl`: String (Cloudinary URL)
- `status`: String (Enum: `['pending', 'approved', 'rejected', 'completed', 'cancelled']`, Default: `'pending'`)
- `rejectionReason`: String
- `resultsSummary`: String
- `createdAt`: Date
- `updatedAt`: Date

#### **3. Registration Schema (`registrations`)**
- `_id`: ObjectId
- `student`: ObjectId (Ref: `'User'`, Required)
- `event`: ObjectId (Ref: `'Event'`, Required)
- `registrationDate`: Date (Default: `Date.now`)
- `attendanceStatus`: String (Enum: `['absent', 'present']`, Default: `'absent'`)
- `attendedAt`: Date
- `certificateGenerated`: Boolean (Default: `false`)
- `certificateUrl`: String

#### **4. Feedback Schema (`feedbacks`)**
- `_id`: ObjectId
- `student`: ObjectId (Ref: `'User'`, Required)
- `event`: ObjectId (Ref: `'Event'`, Required)
- `rating`: Number (Required, Range: `1-5`)
- `comments`: String
- `createdAt`: Date

#### **5. Notification Schema (`notifications`)**
- `_id`: ObjectId
- `user`: ObjectId (Ref: `'User'`, Required)
- `title`: String (Required)
- `message`: String (Required)
- `type`: String (Enum: `['event_approval', 'event_rejection', 'registration_confirm', 'event_reminder', 'certificate_ready']`)
- `isRead`: Boolean (Default: `false`)
- `createdAt`: Date

#### **6. Certificate Schema (`certificates`)**
- `_id`: ObjectId
- `certificateId`: String (Unique Code, e.g., `CERT-2026-CSE001`)
- `student`: ObjectId (Ref: `'User'`, Required)
- `event`: ObjectId (Ref: `'Event'`, Required)
- `issueDate`: Date (Default: `Date.now`)
- `pdfPath`: String

---

### 5. REST API Specifications

#### **Auth Routes (`/api/auth`)**
- `POST /api/auth/register` — Register new user (Student / Organizer)
- `POST /api/auth/login` — Authenticate user & return JWT token + user profile
- `GET /api/auth/me` — Get current logged-in user profile (Protected)
- `PUT /api/auth/profile` — Update user profile & interests (Protected)

#### **Event Routes (`/api/events`)**
- `GET /api/events` — Get all approved events (Filter by category, search, department, date)
- `GET /api/events/all` — Get all events (Admin only)
- `GET /api/events/my-events` — Get events created by logged-in organizer
- `GET /api/events/:id` — Get single event details
- `POST /api/events` — Create new event (Organizer/Admin, includes Conflict Detection check)
- `PUT /api/events/:id` — Update event details (Organizer/Admin)
- `DELETE /api/events/:id` — Delete event (Organizer/Admin)
- `PATCH /api/events/:id/status` — Approve/Reject event status (Admin only)
- `POST /api/events/check-conflict` — Venue & time conflict verification utility

#### **Registration Routes (`/api/registrations`)**
- `POST /api/registrations/:eventId` — Register student for an event
- `GET /api/registrations/my` — Get logged-in student's registrations
- `GET /api/registrations/event/:eventId` — Get registrants list for an event (Organizer/Admin)
- `PATCH /api/registrations/:id/attendance` — Mark attendance (`present`/`absent`) (Organizer/Admin)

#### **Smart Feature Routes (`/api/recommendations` & `/api/analytics`)**
- `GET /api/recommendations` — Fetch personalized content-based recommended events with score & explanation (Student)
- `GET /api/analytics/organizer` — Fetch organizer event engagement analytics
- `GET /api/analytics/admin` — Fetch system-wide participation & category analytics

#### **Feedback & Certificate Routes**
- `POST /api/feedbacks/:eventId` — Submit feedback and rating (Attended student)
- `GET /api/feedbacks/event/:eventId` — Get feedbacks for an event
- `GET /api/certificates/:eventId/download` — Stream/Download PDF Certificate (Attended student)
- `GET /api/notifications` — Fetch user notifications

---

### 6. Coding & Development Rules
1. **Beginner Friendly & Viva Ready:** Code must be clear, modular, well-commented, and easy to explain during academic viva.
2. **Security & Secrets:** All secrets (`JWT_SECRET`, `MONGO_URI`, `CLOUDINARY_*`) MUST reside in `.env`. Never commit `.env`.
3. **Robust Authorization:** Enforce backend JWT verify + RBAC middleware on every protected route. Never rely solely on frontend client checks.
4. **Input Validation & Clean Handling:** Always validate incoming API body data. Handle loading, empty, and error UI states gracefully.
5. **Conflict Detection Guarantee:** Never allow double booking of the same venue at overlapping date/time slots.

---

### 7. Current Implementation Status
- **Day 1 Goal:** Project Setup & Architectural Foundation.
- **Folder Structure:** Backend & Frontend scaffolded.
- **Git Repo:** Initialized.
- **Status:** Architecture finalized, schema defined, API endpoints mapped out. Ready for Day 1 skeleton files creation.

---

### 8. Important Architectural Decisions
- Monorepo-style structure inside single repository (`backend/` and `frontend/`).
- Native Content-Based Filtering algorithm implemented directly in Node.js (no Python dependency as requested).
- PDF Certificates generated dynamically on request using `pdfkit` to avoid unnecessary disk storage bloat.
