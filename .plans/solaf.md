# Employee Advance Management Module (Technical Specification)

## Module Overview

The **Employee Advance Management Module** enables organizations to manage employee salary advances through a structured approval workflow integrated with HR, Finance, Payroll, and Accounting. The module provides complete visibility of outstanding employee advances before approving any new request, ensuring financial control and compliance with company policies.

---

# Objectives

- Digitize employee advance requests.
- Implement a multi-level approval workflow.
- Display outstanding advance balances before payment.
- Prevent unauthorized or excessive advances.
- Integrate with Payroll and Accounting.
- Maintain a complete audit trail for all actions.

---

# Workflow

## Step 1 – Employee Creates Advance Request

The employee submits a new advance request from the Employee Portal.

### Required Fields

- Request Number (Auto Generated)
- Request Date
- Employee Name
- Employee ID
- Department
- Position
- Requested Amount
- Reason for Advance
- Expected Date
- Attachments (Optional)
- Status

Initial Status:

```
Pending Manager Approval
```

---

## Step 2 – Direct Manager Approval

The direct manager reviews the request.

Available Actions:

- Approve
- Reject
- Request Changes

If approved:

```
Status = Pending HR Approval
```

---

## Step 3 – HR Approval

The HR Department validates:

- Employee eligibility
- Company advance policy
- Employment status
- Existing outstanding advances
- Maximum advance limit
- Required documents

If approved:

```
Status = Pending Finance Processing
```

---

## Step 4 – Finance Review

Before approving payment, the Finance Department automatically receives the employee's current advance summary.

The system should display:

- Previous Outstanding Advance Balance
- Current Requested Amount
- Total Outstanding Balance After Payment

### Example

Employee:

```
Hafez Rahim
```

Current Outstanding Advance:

```
3,000 EGP
```

New Request:

```
2,000 EGP
```

The Finance screen should automatically calculate:

| Item | Amount |
|------|--------:|
| Previous Outstanding Balance | 3,000 EGP |
| New Advance Request | 2,000 EGP |
| Total Outstanding After Approval | **5,000 EGP** |

Calculation:

```text
Total Outstanding Balance
= Previous Outstanding Balance
+ Requested Advance Amount

= 3,000 + 2,000

= 5,000 EGP
```

This calculation must be generated automatically by the system.

---

## Step 5 – Finance Payment

Finance can:

- Approve Payment
- Reject Payment
- Put On Hold

If payment is approved:

The system shall:

- Generate a Payment Voucher
- Create Accounting Entries
- Update Employee Advance Balance
- Notify Employee
- Notify HR

Final Status:

```
Paid
```

---

# Advance Repayment

Each advance record shall maintain:

- Total Advance Amount
- Paid Amount
- Remaining Balance
- Installment Count
- Installment Amount
- Payroll Deduction Start Date
- Payroll Deduction End Date
- Repayment Status

Possible repayment statuses:

- Active
- Completed
- Closed

---

# Finance Dashboard

Finance users should be able to view:

## Employee Information

- Employee Name
- Employee ID
- Department
- Position

## Advance Summary

- Total Previous Advances
- Total Outstanding Balance
- Total Paid
- Remaining Balance
- Requested Amount
- New Outstanding Balance
- Last Advance Date
- Number of Active Advances

---

# Business Rules

## Approval Rules

- Employee cannot approve their own request.
- HR approval is not allowed before Manager approval.
- Finance payment is not allowed before HR approval.

---

## Financial Rules

- Outstanding balance must be calculated automatically.
- Maximum advance limits must follow company policy.
- Finance must always see the employee's current outstanding balance.
- Every approved payment updates the employee's balance immediately.
- Cancelled or rejected requests must not affect balances.

---

## Audit Rules

Every action must be logged:

- Created By
- Approved By Manager
- Approved By HR
- Approved By Finance
- Rejected By
- Date & Time
- Comments

No approved request can be permanently deleted.

---

# Request Status Flow

```text
Draft
      │
      ▼
Pending Manager Approval
      │
      ▼
Pending HR Approval
      │
      ▼
Pending Finance Processing
      │
      ▼
Approved for Payment
      │
      ▼
Paid
```

Alternative paths:

```text
Rejected

Cancelled

Returned for Modification
```

---

# Notifications

The system shall send notifications when:

- Request submitted
- Manager approved
- Manager rejected
- HR approved
- HR rejected
- Finance approved
- Finance rejected
- Payment completed

Notifications may be sent through:

- In-System Notifications
- Email
- Mobile Push Notification

---

# Integration

The module should integrate with:

- Employee Management
- HR Module
- Payroll Module
- Accounting Module
- Payment Voucher Module
- Notification Center
- Audit Log System

---

# Permissions

## Employee

- Create Request
- View Own Requests
- Track Status

---

## Manager

- View Team Requests
- Approve
- Reject
- Request Changes

---

## HR

- Review Requests
- Verify Policy Compliance
- Approve
- Reject

---

## Finance

- View Outstanding Balances
- Approve Payment
- Generate Payment Voucher
- Post Accounting Entry

---

## Administrator

- Configure Approval Workflow
- Configure Maximum Advance Limits
- Configure Repayment Policies
- View Audit Logs
- Manage Permissions

---

# Database Considerations

## Main Tables

### employee_advances

- id
- employee_id
- request_number
- requested_amount
- approved_amount
- outstanding_balance
- status
- reason
- request_date
- payment_date

---

### employee_advance_approvals

- id
- advance_id
- approver_id
- approval_level
- action
- comments
- approval_date

---

### employee_advance_installments

- id
- advance_id
- payroll_period
- installment_amount
- paid_amount
- remaining_amount
- status

---

# Expected Outcome

The Employee Advance Management Module provides a secure and transparent workflow where employees submit advance requests, managers and HR validate them, and Finance reviews the employee's outstanding balance before payment. The system automatically calculates the new outstanding balance, updates financial records after payment, integrates with Payroll for installment deductions, and maintains a complete audit trail for governance and compliance.