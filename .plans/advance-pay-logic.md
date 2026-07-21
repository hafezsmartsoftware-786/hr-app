# Advance Payment Module – Business Logic

## Advance Payment Rules

1. **Probation Restriction**

   * Employees are not eligible to request an advance payment during the first **3 months** of their employment contract.

2. **Annual Advance Limit**

   * Each employee is assigned a configurable **annual advance payment limit**. The system must validate the remaining yearly eligibility before approving any new request.

3. **Request Period**

   * Advance payment requests, approvals, and related processing are only permitted between the **15th and 20th** of each calendar month.

4. **Outstanding Advance Validation**

   * Employees with any **active or unpaid advance payment** are not allowed to submit a new advance payment request until the previous advance has been fully settled.

5. **Installment Schedule Management**

   * HR Administrators and System Administrators have permission to modify the **installment start date** and repayment schedule when required.

6. **Installment Tracking**

   * The system shall maintain an **Installment Schedule** for every approved advance payment with the following fields:

     * Installment Number
     * Due Date
     * Installment Amount
     * Payment Date
     * Status (`Pending`, `Returned`)
     * Remarks
