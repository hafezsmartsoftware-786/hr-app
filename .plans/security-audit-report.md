# Deep Security Audit Report

## Overview
A comprehensive review of the backend functions (advances.functions.ts, leaves.functions.ts, auth.functions.ts, attendance.functions.ts, etc.) revealed several security weaknesses ranging from low to high severity. The most critical issues involve broken access controls that bypass database Row Level Security (RLS).

---

## Findings

### 1. Broken Access Control in Advance Approvals (Severity: HIGH 🔴)
**Location:** src/backend/functions/advances.functions.ts -> managerDecideAdvance

**Description:** 
The managerDecideAdvance function is protected only by the requireSupabaseAuth middleware, meaning any authenticated user can call it. Inside the function, it uses the supabaseAdmin client (which bypasses all RLS policies) to fetch and update the advance request. 

While it checks that the caller is not approving their own advance (row.employee_id === context.userId), it **fails to verify that the caller is actually the assigned manager** of the employee who made the request, nor does it check if the caller has a manager role.

**Impact:**
Any employee could intercept or guess an advance request ID and approve it on behalf of the manager, leading to unauthorized financial payouts.

**Recommendation:**
1. Fetch the requesting employee's profile to check their manager_id.
2. Ensure context.userId === employeeProfile.manager_id.
3. Alternatively, implement a requireManagerRole middleware.

---

### 2. Over-reliance on RLS for Leave Approvals (Severity: MEDIUM 🟡)
**Location:** src/backend/functions/leaves.functions.ts -> decideLeave

**Description:**
The decideLeave function updates the status of a leave request using the standard user context.supabase client. It relies entirely on Postgres Row Level Security (RLS) to ensure that only authorized personnel (HR or Managers) can perform the UPDATE operation. 

**Impact:**
If the RLS UPDATE policy on the leaves table is ever misconfigured—for example, if employees are granted UPDATE access to modify their own pending requests—they could manually set their leave status to Approved.

**Recommendation:**
Add a backend validation step to confirm the user has the required role (e.g., Admin, hr, or is the direct manager) before executing the update, providing defense-in-depth in case of RLS misconfigurations.

---

### 3. Client-Side Data Trust in Leave Submission (Severity: LOW 🟢)
**Location:** src/backend/functions/leaves.functions.ts -> submitLeave

**Description:**
When an employee submits a leave request, the client payload includes leave_type_name. The server blindly inserts this leave_type_name into the leaves table instead of deriving it securely from the database based on the leave_type_id.

**Impact:**
A malicious user could manipulate the API request to submit a leave request with a legitimate leave_type_id but an arbitrary or misleading leave_type_name (e.g., "Paid Vacation" when it's actually unpaid), which could confuse HR or payroll systems if they rely on the text field.

**Recommendation:**
In submitLeave, fetch the name from the leave_types table using the provided leave_type_id and use that authoritative value for the insert.

---

### 4. Silent Audit Logging Failures due to RLS (Severity: LOW 🟢)
**Location:** src/backend/functions/auth.functions.ts -> fetchTargetInfo

**Description:**
When assigning or removing roles via assignRole or bulkChangeRole, the system writes an audit log. To populate the target user's name and email in the log, it calls fetchTargetInfo using the caller's standard context.supabase client.

**Impact:**
If the caller's RLS context does not grant read access to all profiles (for instance, if an admin has limited profile visibility due to a bug or specific policy), the profile lookup will silently return empty results. The audit log will still be written, but with target_email: null and target_name: null, degrading the audit trail's value.

**Recommendation:**
Use the supabaseAdmin client within fetchTargetInfo to ensure the system can always resolve the target user's details for auditing purposes.

---

### 5. Missing Ownership Check in Leave Cancellation (Severity: HIGH 🔴)
**Location:** src/backend/functions/leaves.functions.ts -> cancelLeave

**Description:**
The cancelLeave function accepts a leave request ID from the client and cancels it using the standard user Supabase client. It performs **no server-side ownership check** to verify that the leave being cancelled belongs to the caller. It relies entirely on RLS to enforce this.

**Impact:**
If the leaves table RLS policy for UPDATE/DELETE is ever permissive (or misconfigured), any authenticated employee could cancel another employee's approved leave by guessing or knowing their leave request UUID. This is an IDOR (Insecure Direct Object Reference) vulnerability.

**Recommendation:**
Add an explicit ownership check before cancelling:
```ts
const { data: row } = await context.supabase
  .from("leaves").select("employee_id, status").eq("id", data.id).single();
if (!row || row.employee_id !== context.userId) throw new Error("Forbidden");
if (!["pending", "approved"].includes(row.status)) throw new Error("Leave cannot be cancelled at this stage");
```

---

### 6. adminBulkLeaveDeduction Missing Role Check (Severity: HIGH 🔴)
**Location:** src/backend/functions/leaves.functions.ts -> adminBulkLeaveDeduction

**Description:**
The adminBulkLeaveDeduction function is named "admin" and performs a mass payroll-affecting action (bulk-inserting approved leave deductions for ALL employees). However, it is protected only by requireSupabaseAuth — the same middleware used for basic employee-facing endpoints. There is **no role check** (admin, hr, etc.) performed anywhere inside the handler.

**Impact:**
Any authenticated employee can call this endpoint and instantly insert bulk "approved" leave deductions affecting every employee in the company. This can corrupt leave balances, impact payroll calculations, and create fraudulent leave records company-wide.

**Recommendation:**
Replace the requireSupabaseAuth middleware with requireAdminAccess, or add an explicit role check at the top of the handler:
```ts
const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
if (!isAdmin) throw new Error("Forbidden");
```

---

### 7. Employee-Controlled Advance Eligibility Check (Severity: MEDIUM 🟡)
**Location:** src/backend/functions/advances.functions.ts -> getAdvanceEligibility

**Description:**
The getAdvanceEligibility function accepts an optional employee_id parameter from the client. If provided, it fetches eligibility data (outstanding balance, pending requests, annual limit) for **that employee** using the caller's own context.supabase client. There is no check to verify that the caller is an admin or HR — any authenticated user can pass any employee_id.

**Impact:**
Any employee can query the financial advance eligibility details of any other employee, including their outstanding balance, annual limit used, and whether they have pending requests. This constitutes unauthorized access to sensitive financial data of other employees.

**Recommendation:**
Either remove the employee_id parameter entirely and always use context.userId, or require admin/HR access when employee_id differs from the caller:
```ts
const requestedId = (data as any)?.employee_id;
if (requestedId && requestedId !== context.userId) {
  // Must be admin or HR to query another employee
  await assertAdminOrHr(context.supabase, context.userId);
}
const employeeId = requestedId || context.userId;
```

---

### 8. GPS/Network Spoofing in Attendance Check-In (Severity: MEDIUM 🟡)
**Location:** src/backend/functions/attendance.functions.ts -> checkIn

**Description:**
The geofencing validation in checkIn trusts GPS coordinates (lat/lng) and the SSID string **entirely as sent by the client**. The server performs the distance calculation on the server-side correctly, but the underlying coordinate data is user-supplied. Similarly, the SSID is simply compared by string value — there is no BSSID (MAC address) verification performed even though the bssid field exists in the network schema.

**Impact:**
1. **GPS Spoofing:** An employee can use a GPS spoofer app or manually craft the API request to send coordinates matching an authorized geofence while being physically elsewhere.
2. **SSID Spoofing:** An employee can create a mobile hotspot with the same SSID name as an authorized office network to bypass the network check. The BSSID field (which would make this harder) is stored but never compared.

**Recommendation:**
1. Log the submitted coordinates and SSID persistently alongside the attendance record for forensic auditing.
2. Enable BSSID comparison in the network check in addition to SSID:
```ts
const onAuthorizedNetwork = nets.length > 0 && !!data.ssid && nets.some(
  (n: any) => n.ssid === data.ssid && (!data.bssid || !n.bssid || n.bssid === data.bssid)
);
```
3. Flag check-ins marked free_check: true for manual HR review.
