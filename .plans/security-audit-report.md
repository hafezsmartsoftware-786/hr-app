# Deep Security Audit Report

## Overview
A comprehensive review of the backend functions (dvances.functions.ts, leaves.functions.ts, uth.functions.ts, etc.) revealed several security weaknesses ranging from low to high severity. The most critical issues involve broken access controls that bypass database Row Level Security (RLS).

---

## Findings

### 1. Broken Access Control in Advance Approvals (Severity: HIGH 🔴)
**Location:** src/backend/functions/advances.functions.ts -> managerDecideAdvance

**Description:** 
The managerDecideAdvance function is protected only by the equireSupabaseAuth middleware, meaning any authenticated user can call it. Inside the function, it uses the supabaseAdmin client (which bypasses all RLS policies) to fetch and update the advance request. 

While it checks that the caller is not approving their own advance (ow.employee_id === context.userId), it **fails to verify that the caller is actually the assigned manager** of the employee who made the request, nor does it check if the caller has a manager role.

**Impact:**
Any employee could intercept or guess an advance request ID and approve it on behalf of the manager, leading to unauthorized financial payouts.

**Recommendation:**
1. Fetch the requesting employee's profile to check their manager_id.
2. Ensure context.userId === employeeProfile.manager_id.
3. Alternatively, implement a equireManagerRole middleware.

---

### 2. Over-reliance on RLS for Leave Approvals (Severity: MEDIUM 🟡)
**Location:** src/backend/functions/leaves.functions.ts -> decideLeave

**Description:**
The decideLeave function updates the status of a leave request using the standard user context.supabase client. It relies entirely on Postgres Row Level Security (RLS) to ensure that only authorized personnel (HR or Managers) can perform the UPDATE operation. 

**Impact:**
If the RLS UPDATE policy on the leaves table is ever misconfigured—for example, if employees are granted UPDATE access to modify their own pending requests—they could manually set their leave status to pproved.

**Recommendation:**
Add a backend validation step to confirm the user has the required role (e.g., dmin, hr, or is the direct manager) before executing the update, providing defense-in-depth in case of RLS misconfigurations.

---

### 3. Client-Side Data Trust in Leave Submission (Severity: LOW 🟢)
**Location:** src/backend/functions/leaves.functions.ts -> submitLeave

**Description:**
When an employee submits a leave request, the client payload includes leave_type_name. The server blindly inserts this leave_type_name into the leaves table instead of deriving it securely from the database based on the leave_type_id.

**Impact:**
A malicious user could manipulate the API request to submit a leave request with a legitimate leave_type_id but an arbitrary or misleading leave_type_name (e.g., "Paid Vacation" when it's actually unpaid), which could confuse HR or payroll systems if they rely on the text field.

**Recommendation:**
In submitLeave, fetch the 
ame from the leave_types table using the provided leave_type_id and use that authoritative value for the insert.

---

### 4. Silent Audit Logging Failures due to RLS (Severity: LOW 🟢)
**Location:** src/backend/functions/auth.functions.ts -> etchTargetInfo

**Description:**
When assigning or removing roles via ssignRole or ulkChangeRole, the system writes an audit log. To populate the target user's name and email in the log, it calls etchTargetInfo using the caller's standard context.supabase client.

**Impact:**
If the caller's RLS context does not grant read access to all profiles (for instance, if an admin has limited profile visibility due to a bug or specific policy), the profile lookup will silently return empty results. The audit log will still be written, but with 	arget_email: null and 	arget_name: null, degrading the audit trail's value.

**Recommendation:**
Use the supabaseAdmin client within etchTargetInfo to ensure the system can always resolve the target user's details for auditing purposes.
