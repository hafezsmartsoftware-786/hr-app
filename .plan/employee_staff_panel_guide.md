# Employee & Staff Panel - Flutter App Guide

This document outlines the logic, UI/UX guidelines, color palette, and APIs for the Flutter application's Employee and Staff Panel.

## 1. App Logic & Architecture

### User Roles
- **Employee/Staff**: Standard user who can view their own profile, mark attendance, request leaves, view payroll, and request advances.
- **Manager/Supervisor (Optional)**: Can approve leaves and view team attendance.

### Core Modules
1. **Authentication**:
   - Login via Email/Password or OTP.
   - Secure token storage using `flutter_secure_storage`.
   - Auto-login check on app start.

2. **Dashboard**:
   - Quick overview: Today's attendance status, upcoming holidays, pending leave status.
   - Quick actions: "Check In/Out", "Apply Leave", "Request Advance".

3. **Attendance**:
   - Geo-fenced check-in/check-out (optional).
   - Monthly calendar view showing present, absent, and leave days.

4. **Leave Management**:
   - Form to apply for leave (Start Date, End Date, Reason, Leave Type).
   - List of past and pending leave requests with status indicators (Pending, Approved, Rejected).

5. **Payroll & Advances**:
   - View monthly payslips (PDF download or list view).
   - Request employee advances/loans.
   - View history of taken advances and repayment status.

6. **Profile**:
   - Personal details, emergency contacts, and document uploads.

## 2. UI/UX Guidelines

### Design Philosophy
- **Clean & Minimalist**: Reduce cognitive load by keeping screens uncluttered.
- **Card-based Layouts**: Use cards with subtle shadows to group related information (e.g., a leave request card).
- **Typography**: Use a modern, readable font like `Inter` or `Roboto`.
  - Headers: Bold, 20-24sp.
  - Body: Regular, 14-16sp.
  - Captions: Light, 12sp.
- **Bottom Navigation**: Use a bottom navigation bar for core tabs: Home, Attendance, Leaves, Profile.

### Micro-interactions
- Add a subtle ripple effect or scale animation when pressing buttons.
- Use skeleton loaders instead of spinning circular progress indicators when fetching data.
- Show SnackBar/Toast for success/error messages (e.g., "Check-in successful").

## 3. Color Palette

Provide both Light and Dark mode support. Here is the recommended palette:

### Light Theme
- **Primary Color**: `#0F52BA` (Sapphire Blue) - Used for primary buttons, active icons, app bar.
- **Secondary/Accent Color**: `#FF9800` (Orange) - Used for floating action buttons or highlight badges.
- **Background**: `#F8F9FA` (Off-white/Light Gray) - App background color.
- **Surface**: `#FFFFFF` (White) - Card and dialog backgrounds.
- **Text Primary**: `#212121` (Dark Gray) - Main headings and body text.
- **Text Secondary**: `#757575` (Medium Gray) - Subtitles and captions.

### Status Colors
- **Success**: `#4CAF50` (Green) - Approved leaves, successful check-ins.
- **Warning**: `#FFEB3B` (Yellow) - Pending requests.
- **Error/Danger**: `#F44336` (Red) - Rejected leaves, missed attendance.

## 4. API Endpoints

The Flutter app will interface with our Supabase/Backend API. Below are the primary endpoints and logic required:

### Authentication
- `POST /auth/login`: Authenticate and receive JWT.
- `POST /auth/logout`: Invalidate session.
- `GET /auth/me`: Get current user details and role.

### Attendance
- `POST /attendance/check-in`: Record start time (payload: `{ timestamp, location }`).
- `POST /attendance/check-out`: Record end time (payload: `{ timestamp, location }`).
- `GET /attendance/monthly?month=YYYY-MM`: Fetch attendance records for a specific month.

### Leave Management
- `GET /leaves/my-leaves`: Fetch list of user's leaves.
- `POST /leaves/apply`: Create a new leave request (payload: `{ type, startDate, endDate, reason }`).
- `GET /leaves/balances`: Fetch remaining leave balances.

### Payroll & Advances
- `GET /payroll/payslips`: Fetch available payslips.
- `GET /advances/my-advances`: Fetch advance history.
- `POST /advances/request`: Request a new advance (payload: `{ amount, reason, requestedDate }`).

## 5. Recommended Flutter Packages
- **State Management**: `riverpod` or `bloc`.
- **API/Networking**: `http` or `dio`.
- **Database/Storage**: `shared_preferences` and `flutter_secure_storage`.
- **UI Components**: `google_fonts`, `flutter_svg`, `shimmer` (for loading states).
- **Date/Time**: `intl`.

---
*Note for Developer: Ensure to handle network exceptions gracefully and provide retry mechanisms for critical API calls like Check-In.*
