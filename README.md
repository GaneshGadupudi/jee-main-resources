# JEE Compass — Preparation Platform & Mentorship Network

A full-stack, enterprise-grade web application for JEE Main and JEE Advanced aspirants featuring adaptive practice, previous year questions (PYQ) review, live 1-on-1 doubt mentoring desks, mentor application lifecycle management, and a centralized administrative command center.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router with React 19)
- **Styling**: Tailwind CSS & Lucide React
- **Database**: Microsoft SQL Server (MS SQL Server 2025 / `SQLEXPRESS`)
- **DB Driver**: `mssql` with `msnodesqlv8` (Windows Trusted Authentication / ODBC Driver 18)
- **Authentication**: Custom Secure Cookie Session (`jee_session`) with role-based authorization (`admin`, `mentor`, `student`)
- **Password Security**: `bcryptjs` salt & hashing
- **File Storage**: Local persistent disk storage (`storage/resumes/`) with authenticated streaming routes
- **Email Delivery**: `nodemailer` (SMTP or direct fallback)

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- Node.js 18.x, 20.x, or 22.x
- Microsoft SQL Server (`SQLEXPRESS` instance with Windows Authentication enabled)
- ODBC Driver 18 for SQL Server installed on Windows

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Ensure `.env.local` exists in the project root with the following configuration:
```env
# Database Configuration
MSSQL_SERVER=localhost
MSSQL_INSTANCE=SQLEXPRESS
MSSQL_DATABASE=JEE_Preparation_Platform
MSSQL_ODBC_DRIVER=ODBC Driver 18 for SQL Server

# Admin Configuration
ADMIN_EMAIL=admin@jeecompass.com

# SMTP Email Configuration (Optional - fallback logs gracefully if unconfigured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=586
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="JEE Compass" <support@jeecompass.com>
```

### 4. Database Setup & Migration
Execute the migration script located at `database/MentorApplications.sql` against your `JEE_Preparation_Platform` database:
- Updates `dbo.Users` constraint `CK_Users_Role` to support `'student'`, `'mentor'`, and `'admin'`.
- Creates `dbo.MentorApplications` with applicant contact details, academic credentials, teaching experience, preferred mentoring mode, resume metadata, interview scheduling details, and internal admin notes.

You can run this migration via SQL Server Management Studio (SSMS) or using the migration script:
```bash
node scripts/migrate-mentor-applications.mjs
```

### 5. Admin Account Provisioning
Provision the verified administrator account into `dbo.Users` with bcrypt password hashing:
```bash
node scripts/seed-admin.mjs
```

**Verified Admin Account Credentials:**
- **Email:** `admin@jeecompass.com`
- **Password:** `%R6jdv^qbq!3t46b`
- **Role:** `admin`

---

## 🧭 Key Routes & Features

### 1. Landing Page (`/`)
- Clearly visible **"Register as a Mentor"** button in the hero section.
- Dedicated **"Mentorship Network"** banner section highlighting benefits and offering one-click access to registration (`/mentor/register`) and application tracking (`/mentor/application-status`).

### 2. Mentor Registration (`/mentor/register`)
- Responsive multi-section registration form with client and server-side validation.
- Fields:
  - Full Name, Email, Phone
  - Highest Qualification, College/Institution, Current Profession
  - Total Experience (years), Areas of Expertise / Subjects
  - Professional Bio, Teaching / Mentoring Experience
  - Preferred Mentoring Mode (`Online`, `Offline`, `Hybrid`)
  - Target Exam Focus (`JEE Main`, `JEE Advanced`, `Both`)
  - Weekly Availability Hours (e.g. 5, 10, 15, 20+ hrs)
  - LinkedIn Profile URL
  - Drag-and-drop Resume Upload (PDF up to 5MB, with magic bytes and MIME validation).
- Submissions generate a unique Application ID (e.g., `APP-2026-XXXXX`), insert status `Pending`, securely store the resume file in `storage/resumes/`, and send a confirmation email.

### 3. Application Status Tracker (`/mentor/application-status`)
- Allows applicants to look up their current status by **Application ID** or **Registered Email**.
- Visual step progression:
  1. Application Submitted (`Pending`)
  2. Credential Evaluation (`Under Review`)
  3. Technical Interview (`Interview Scheduled`)
  4. Verified & Onboarded (`Accepted`)
- Real-time display of interview date, time, mode, and meeting links when scheduled.

### 4. Admin Command Center (`/admin/dashboard` & `/admin/pyq`)
- **Consistent Admin Navbar** (`components/AdminHeader.jsx`):
  - Visible and identical across all admin sections (Mentor Applications and PYQ Review).
  - Navigation contains **strictly only two options**:
    1. **Mentor Applications** (`/admin/dashboard`)
    2. **PYQ Review** (`/admin/pyq`)
  - **Light/Dark Mode Toggle**: Dedicated sun/moon toggle button integrated into the admin header, persisting via `localStorage` and `html[data-theme]` across page transitions and reloads.
  - No Student Dashboard or Doubt Requests links are present.
- **Mentor Applications Management**:
  - **Metric Cards**: Total, Pending, Under Review, Interview Scheduled, Accepted, Declined.
  - **Search, Filter & Sort**: Live search, status tabs, experience and date sorting.
  - **Application Detail Modal**: Complete background inspection, pedagogical experience, target exams.
  - **Secure Resume Access**: Authenticated PDF streaming route (`/api/admin/mentor-applications/[id]/resume`).
  - **Lifecycle Actions**: Move to Under Review, Schedule Interview modal with meeting link, Accept & grant mentor role, Decline, and Private Admin Notes.
- **Curriculum PYQ Review**:
  - Admin header with theme toggle and navigation.
  - Compare questions against official NTA papers, edit options, verify answers, and publish/draft questions.

### 5. Unified Role-Based Authentication (`/login`)
All user roles (Students, Mentors, and Administrators) log in via the single login portal at `/login`:
- `admin` $\rightarrow$ automatically redirected to `/admin/dashboard`
- `mentor` $\rightarrow$ automatically redirected to `/mentor/dashboard`
- `student` $\rightarrow$ automatically redirected to `/dashboard`
- Protected routes enforce authorization both in the frontend and at the backend API layer (`lib/admin.js`). Non-admin attempts to access `/admin/*` or `/api/admin/*` receive HTTP 403 Forbidden.

### 6. Database Cleanup Script
To reset and clear test data while preserving user accounts, admin authentication, and curriculum taxonomy:
```bash
node scripts/clear-data.mjs
```

---

## 🧪 Testing & Verification

Run the automated end-to-end database and workflow test:
```bash
node scripts/test-mentor-admin-flow.mjs
```

Run the live HTTP API suite against `http://localhost:3000`:
```bash
node scripts/test-http-apis.mjs
```

Run the full Next.js production build:
```bash
npm run build
```

---

## 🔒 Security Summary

1. **No Plaintext Passwords**: All user and admin passwords are encrypted with `bcrypt` (10 salt rounds).
2. **Private File Storage**: Resumes are stored in the server's root `storage/resumes/` folder outside the public web root. Access is gated through the authenticated admin streaming handler `/api/admin/mentor-applications/[id]/resume`.
3. **Server-Side Authorization**: API routes use `adminRoute` wrapper verifying `session.role === 'admin'` or matching `ADMIN_EMAIL`.
4. **Input Sanitization & Parameterized Queries**: All database operations use parameterized `@input` parameters via `mssql` to eliminate SQL injection vulnerabilities.

