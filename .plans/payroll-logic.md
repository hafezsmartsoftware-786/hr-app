# Payroll Calculation Module
## Technical Specification
### Employee Payroll Calculation Logic

---

# Overview

The Payroll Calculation Module is responsible for calculating employee salaries, statutory deductions, taxes, insurance contributions, allowances, penalties, and the final net salary according to Egyptian payroll regulations.

The module should support monthly payroll processing, employee master data, social insurance, income tax calculations, bank transfer amounts, and reconciliation.

---

# Employee Payroll Fields

## Employee Information

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| Employee Code | String | Yes | Unique employee identifier |
| Employee Name | String | Yes | Full employee name |
| Job Title | Lookup | Yes | Employee position |
| National ID | String | Yes | Egyptian National ID |
| Mobile Number | String | Yes | Employee phone number |

---

## Social Insurance Information

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| Insurance Number | String | Yes | Social Insurance Number |
| Insurance Registration Date | Date | Yes | Date of joining social insurance |
| Insurance Status | Enum | Yes | Active, Suspended, Not Insured |
| Employment Duration | Auto | Yes | Calculated from hiring date |

---

## Salary Components

| Field | Type | Formula | Description |
|--------|------|----------|-------------|
| Basic Salary | Currency | Manual | Employee basic salary |
| Allowances & Bonuses | Currency | Manual | Fixed and variable allowances |
| Gross Income | Currency | Basic Salary + Allowances | Total monthly salary |

```
Gross Income = Basic Salary + Allowances & Bonuses
```

---

## External Employer Income

| Field | Type | Description |
|--------|------|-------------|
| Income From Other Employers | Currency | Income already received from another employer |

---

## Total Monthly Income

```
Total Income = Gross Income + Income From Other Employers
```

---

## Social Insurance Deduction

### Employee Share

| Field | Formula |
|--------|----------|
| Employee Insurance Contribution | Calculated according to Egyptian Social Insurance Law |

The insurance percentage should be configurable from System Settings.

Example

```
Employee Insurance =
Insurable Salary × Employee Percentage
```

---

### Company Share

| Field | Formula |
|--------|----------|
| Company Insurance Contribution | Calculated using employer contribution percentage |

Example

```
Company Insurance =
Insurable Salary × Company Percentage
```

---

## Other Deductions

The system should support unlimited deduction types.

Examples

- Penalties
- Loans
- Advances
- Court Orders
- Union Fees
- Attendance Penalties
- Late Arrival
- Absence
- Other Deductions

---

## Medical Insurance

Optional deduction.

```
Medical Insurance =
Configured Monthly Amount
```

---

## Net Before Tax

```
Net Before Tax =
Gross Income
-
Employee Insurance
-
Medical Insurance
-
Other Deductions
```

---

# Personal Tax Exemption

The exemption amount must be configurable.

Example

```
Personal Exemption
```

---

# Monthly Taxable Income

```
Taxable Income =
Total Income
-
Personal Exemption
-
Employee Insurance
```

The taxable income cannot be negative.

```
If Taxable Income < 0

Taxable Income = 0
```

---

# Annual Taxable Income

```
Annual Taxable Income =
Monthly Taxable Income × 12
```

---

# Annual Income Tax

Calculated using configurable Egyptian tax brackets.

The system administrator must be able to maintain:

- Tax Brackets
- Tax Percentages
- Fixed Tax Values
- Effective Dates

Example

| From | To | Tax Rate |
|-------|----|----------|
| 0 | XXXX | 0% |
| XXXX | XXXX | 10% |
| XXXX | XXXX | 15% |
| XXXX | XXXX | 20% |
| XXXX | Above | 25% |

---

# Tax Paid at Other Employers

The employee may already have tax deducted by another employer.

```
Tax Paid Elsewhere
```

---

# Current Period Tax

```
Current Period Tax =
Annual Tax
-
Tax Paid Elsewhere

÷ Remaining Payroll Periods
```

The exact calculation method should be configurable.

---

# Additional Deductions

Supports unlimited deductions.

Examples

- Loan Installments
- Company Assets
- Court Orders
- Miscellaneous

---

# Net Salary Formula

```
Net Salary =
Gross Income
-
Employee Insurance
-
Medical Insurance
-
Current Period Tax
-
Other Deductions
```

---

# Bank Transfer

The system should support two bank payment values.

## Actual Bank Transfer

The exact amount transferred to the employee.

---

## Company Bank Transfer

The amount recorded according to company accounting.

---

## Difference

```
Difference =
Company Bank Transfer
-
Actual Bank Transfer
```

The system should highlight differences automatically.

---

# Payroll Calculation Flow

```
Employee Information
        │
        ▼
Basic Salary
        │
        ▼
Allowances
        │
        ▼
Gross Income
        │
        ▼
External Income
        │
        ▼
Total Income
        │
        ▼
Insurance Calculation
        │
        ▼
Medical Insurance
        │
        ▼
Other Deductions
        │
        ▼
Personal Exemption
        │
        ▼
Taxable Income
        │
        ▼
Annual Tax
        │
        ▼
Current Period Tax
        │
        ▼
Net Salary
        │
        ▼
Bank Transfer
        │
        ▼
Payroll Posting
```

---

# Employee Payroll Table

| Field | Description |
|--------|-------------|
| Employee Code | Employee ID |
| Employee Name | Full Name |
| Job Title | Position |
| National ID | National Identification Number |
| Mobile Number | Contact Number |
| Insurance Number | Social Insurance Number |
| Insurance Registration Date | Insurance Joining Date |
| Insurance Status | Active / Suspended |
| Employment Duration | Auto Calculated |
| Basic Salary | Basic Salary |
| Allowances & Bonuses | Monthly Allowances |
| Gross Income | Gross Salary |
| Income From Other Employers | External Income |
| Total Income | Combined Income |
| Employee Insurance Contribution | Employee Share |
| Other Deductions | Penalties & Others |
| Medical Insurance | Medical Deduction |
| Net Before Tax | Before Income Tax |
| Personal Exemption | Tax Exemption |
| Monthly Taxable Income | Monthly Tax Base |
| Annual Taxable Income | Annual Tax Base |
| Annual Tax | Annual Income Tax |
| Tax Paid Elsewhere | Previous Employer Tax |
| Current Period Tax | Monthly Tax |
| Additional Deductions | Miscellaneous |
| Net Salary | Final Salary |
| Company Insurance Contribution | Employer Share |
| Actual Bank Transfer | Paid to Employee |
| Company Bank Transfer | Accounting Amount |
| Difference | Reconciliation |

---

# Configuration Tables

The system should include configurable master tables:

## Salary Components

- Basic Salary
- Housing Allowance
- Transportation
- Mobile
- Meal Allowance
- Bonus
- Incentive
- Commission

---

## Deduction Types

- Insurance
- Medical
- Loans
- Advances
- Penalties
- Court Orders
- Absence
- Late Attendance
- Other

---

## Tax Configuration

- Tax Brackets
- Tax Percentages
- Personal Exemption
- Effective Date

---

## Insurance Configuration

- Employee Percentage
- Employer Percentage
- Maximum Insurance Salary
- Minimum Insurance Salary
- Effective Date

---

# Reports

The module should generate:

- Monthly Payroll Register
- Payslip
- Social Insurance Report
- Income Tax Report
- Bank Transfer File
- Payroll Summary
- Deduction Report
- Allowance Report
- Net Salary Report
- Company Insurance Contribution Report
- Employee Payroll History
- Payroll Comparison Report

---

# Business Rules

- All tax rates must be configurable.
- All insurance percentages must be configurable.
- Personal exemption must be configurable.
- Salary components must support unlimited earning types.
- Deductions must support unlimited deduction types.
- Calculations must be reproducible and auditable.
- Every payroll run must be versioned and locked after approval.
- Payroll calculations should support retroactive adjustments.
- Every formula should be traceable for audit purposes.
- Payroll approval should follow a configurable workflow before posting to Accounting and Bank Transfer modules.