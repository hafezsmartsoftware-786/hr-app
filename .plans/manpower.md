# Manpower Planning Module
## Technical Functional Specification

---

# Overview

The **Manpower Planning Module** is designed to help organizations plan, manage, approve, and monitor workforce requirements across the company. It serves as the foundation for recruitment, budgeting, organizational planning, and workforce forecasting.

The module answers the following questions:

- How many employees are required?
- Which departments need additional staff?
- Which positions are currently vacant?
- What is the hiring budget?
- What is the approval status of each manpower request?

---

# Objectives

- Plan workforce requirements by fiscal year.
- Control organizational headcount.
- Monitor vacancies.
- Connect manpower planning with recruitment.
- Support budget planning.
- Improve hiring decisions.
- Track approved versus actual headcount.

---

# Core Components

## 1. Fiscal Year

Represents the manpower planning period.

Example:

- 2026
- 2027
- 2028

---

## 2. Company

Supports multi-company organizations.

Example:

- Integrated Technics
- ABC Holding
- XYZ Manufacturing

---

## 3. Branch

Allows manpower planning per branch.

Example:

- Cairo
- Alexandria
- Riyadh

---

## 4. Department

The main organizational department.

Examples:

- Human Resources
- Finance
- Information Technology
- Sales
- Marketing
- Procurement

---

## 5. Section / Division

A subdivision within a department.

Example:

Department:
IT

Sections:

- Software Development
- Infrastructure
- Help Desk
- Networking

---

## 6. Job Position

The required position.

Examples:

- Accountant
- HR Officer
- Software Developer
- Project Manager
- Sales Executive

---

## 7. Job Grade

The organizational grade assigned to the position.

Example:

| Grade | Description |
|--------|-------------|
| G01 | Trainee |
| G02 | Junior Staff |
| G03 | Officer |
| G04 | Senior Officer |
| G05 | Specialist |
| G06 | Senior Specialist |
| G07 | Team Leader |
| G08 | Supervisor |
| G09 | Assistant Manager |
| G10 | Manager |
| G11 | Senior Manager |
| G12 | Department Head |
| G13 | Director |
| G14 | Executive Director |
| G15 | CEO |

---

## 8. Planned Headcount

The number of employees planned for the position.

Example:

Backend Developer

Planned Headcount: **5**

---

## 9. Current Headcount

The number of employees currently assigned.

Example:

Current Headcount: **3**

---

## 10. Vacancies

Automatically calculated.

```
Vacancies = Planned Headcount - Current Headcount
```

Example:

```
Planned = 5
Current = 3

Vacancies = 2
```

---

## 11. Employment Type

Examples:

- Full-Time
- Part-Time
- Contract
- Temporary
- Internship

---

## 12. Hiring Reason

Specifies why additional manpower is required.

Examples:

- Business Expansion
- Employee Replacement
- New Project
- Promotion
- Resignation
- Retirement
- Organizational Restructuring

---

## 13. Priority

Determines hiring urgency.

Values:

- High
- Medium
- Low

---

## 14. Required By Date

The expected hiring date.

Example:

```
01 September 2026
```

---

## 15. Salary Range

Includes:

- Minimum Salary
- Maximum Salary
- Currency

---

## 16. Budget Information

Tracks financial approval.

Fields:

- Budget Available
- Budget Approved
- Estimated Annual Cost
- Cost Center

---

## 17. Approval Status

Workflow status.

Examples:

- Draft
- Pending Department Manager Approval
- Pending HR Approval
- Pending Finance Approval
- Pending Executive Approval
- Approved
- Rejected
- Closed

---

# Organizational Hierarchy

```
Company
    │
    ├── Branch
            │
            ├── Department
                    │
                    ├── Section
                            │
                            ├── Job Position
                                    │
                                    ├── Job Grade
                                            │
                                            ├── Planned Headcount
                                            ├── Current Headcount
                                            └── Vacancies
```

---

# Business Workflow

```
HR Creates Manpower Plan
            │
            ▼
Department Manager Reviews
            │
            ▼
HR Department Approval
            │
            ▼
Finance Budget Verification
            │
            ▼
Executive Management Approval
            │
            ▼
Approved Vacancy Created
            │
            ▼
Recruitment Receives Hiring Request
            │
            ▼
Candidate Selection
            │
            ▼
Employee Hired
            │
            ▼
Current Headcount Updated Automatically
            │
            ▼
Vacancy Reduced Automatically
```

---

# Recommended Database Fields

| Field | Description |
|--------|-------------|
| Manpower ID | Unique identifier |
| Fiscal Year | Planning year |
| Company | Company |
| Branch | Branch |
| Department | Department |
| Section | Section |
| Position | Job Position |
| Job Grade | Grade |
| Planned Headcount | Planned employees |
| Current Headcount | Existing employees |
| Vacancies | Calculated vacancies |
| Employment Type | Employment category |
| Hiring Reason | Business justification |
| Priority | Hiring priority |
| Required Date | Expected hiring date |
| Salary From | Minimum salary |
| Salary To | Maximum salary |
| Currency | Salary currency |
| Budget Available | Yes / No |
| Budget Approved | Yes / No |
| Cost Center | Financial cost center |
| Estimated Annual Cost | Budget estimate |
| Status | Current workflow status |
| Created By | Creator |
| Created Date | Creation date |
| Last Updated | Last modification |

---

# Dashboard KPIs

The dashboard should display:

- Total Planned Headcount
- Current Employees
- Total Vacancies
- Approved Positions
- Pending Approvals
- Hiring in Progress
- Filled Positions
- Budget Utilization
- Headcount by Department
- Headcount by Branch
- Monthly Hiring Trend
- Vacancy Distribution
- Approval Status Summary

---

# Reports

The module should support the following reports:

- Manpower Planning Report
- Department Headcount Report
- Branch Headcount Report
- Vacancy Report
- Approved vs Filled Positions
- Budget vs Actual Headcount
- Hiring Forecast
- Recruitment Pipeline Report
- Monthly Hiring Report
- Position Utilization Report
- Organizational Capacity Report

---

# Integration with Other Modules

## Organization Structure

Uses organizational hierarchy including:

- Company
- Branch
- Department
- Section

---

## Job Management

Integrates with:

- Job Positions
- Job Grades
- Job Descriptions
- Salary Structures

---

## Recruitment

Automatically creates recruitment requests once manpower is approved.

---

## HR

Updates employee counts immediately after hiring.

---

## Payroll

Validates salary against:

- Job Grade
- Salary Range
- Budget

---

## Finance

Verifies:

- Budget Availability
- Cost Centers
- Annual Workforce Cost

---

## Performance Management

Supports future workforce planning using:

- Promotions
- Transfers
- Workforce Growth

---

# Example

| Company | Branch | Department | Position | Grade | Planned | Current | Vacancies | Status |
|----------|---------|------------|----------|--------|----------|----------|------------|---------|
| Integrated Technics | Cairo | IT | Backend Developer | G05 | 8 | 6 | 2 | Approved |
| Integrated Technics | Cairo | Finance | Accountant | G03 | 5 | 5 | 0 | Filled |
| Integrated Technics | Alexandria | Sales | Sales Executive | G03 | 12 | 9 | 3 | Hiring |
| Integrated Technics | Cairo | HR | HR Specialist | G05 | 3 | 2 | 1 | Approved |

---

# Benefits

- Centralized workforce planning
- Better hiring decisions
- Accurate headcount management
- Improved budget control
- Automated recruitment requests
- Executive workforce visibility
- Real-time vacancy monitoring
- Better organizational planning
- Full integration with HR, Payroll, Finance, and Recruitment modules

---

# Conclusion

The **Manpower Planning Module** serves as the organization's workforce planning engine. It enables HR and management to forecast staffing needs, control headcount, manage recruitment demands, align hiring with approved budgets, and maintain an optimized organizational structure through a structured approval workflow and real-time reporting.