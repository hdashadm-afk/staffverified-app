# KOS-StaffVerified — HR Forms Library Spec

Build target: 12 HR forms that generate + save to the employee's record (same pattern as the existing NTE/disciplinary module). Fill-in fields marked `[BRACKETS]`. Keep legal clause text **verbatim**.

## Legal entity — LOCKED (Best, July 2026)
**ALL forms use J&J Trading OPC as the single legal entity** (no entity selector).
- **J&J Trading OPC**, principal office **No. 1 (1 Calem St.) Barangay Tandoc, San Carlos City, Pangasinan**
- President: **Edgardo S. Castro**
- Vice-President: **Agnes C. Salvador**
- HR: **Rojelyn V. De Vera** (HR Operations Specialist); also **Jasmin Caranto** (JR HR Business Partner)

## Build pattern
Each form: fields UI → live preview → **Generate & Save** (store record + printable PDF, attach to employee's Documents/Disciplinary tab). Reuse the NTE module + `nte_records`/`/disciplinary` structure already in the repo. Add a general `hr_documents` table if needed (employee_id, form_type, fields json, pdf_path, issued_by, issued_at).

---

## 1. NTE (Notice to Explain) — already built; verify wording matches
To `[employee]` / From: HR Department / Subject: Alleged violation of Rule `[__]` Article `[__]` of Code of Discipline / Date `[__]`.
Details of Violation: Date of incident `[__]`, Time `[__]`, Location `[__]`, Person involved `[__]`, Other person `[__]`, Description `[__]`.
Violation: Rule `[__]` Offenses against/concerning `[__]`, Article `[__]`.
Possible Sanction (select): WR–Written Reprimand / S1–Suspension 1 day / S3–3 days / S5–5 days / D–Dismissal.
If suspension/dismissal → Administrative Hearing on Date `[__]`, Location `[__]`.
Fixed: "directed to explain in writing within five (5) days from receipt…"; failure = waiver.
Sign: Immediate Superior; Received by; Noted by (signature over printed name).

## 2. NOH — Administrative Hearing Notice
To `[employee]` / From: HR DEPARTMENT / Subject: Administrative Hearing for Alleged violation on Company Rules / Date `[__]`.
Body: invited for Administrative Hearing on `[date]` in the afternoon `[time]` at Helium Fuels Office Tandoc, San Carlos, Pangasinan… alleged violation of Company Rules since `[date]`.
Table A: Date of incident | Alleged Violation. Table B: NTE Served Date | Violation | Sanction.
Fixed: "You may also be assisted by a council of your choice." Prepared by `[__]`; Received By: Name `[__]`, Date `[__]`.

## 3. NOD — Notice of Decision
To `[employee]` / From: HR DEPARTMENT / Subject: Alleged violation of Company Rules `[__]` of Code of Discipline / Date `[__]`.
Ref: NTE issued on `[date]` re Rule `[__]` Offenses Against/Concerning `[__]`, Article No `[__]`, Description `[__]`, Sanction `[__]`.
"We received your reply on `[date]`… you explained: `[__]`."
Decision: "substantial basis has been established to justify your violation on: Rule `[__]` Offenses Against/Concerning `[__]`, Article No `[__]`."
Fixed: "Repetition of the same offence will constitute a more serious disciplinary action. (Ang pag ulit ng ganitong violation ay maaring umangat sa mataas na penalty)." Prepared by `[__]`; Received By: Name `[__]`, Date `[__]`.

## 4. Quitclaim — Affidavit of Release, Waiver, and Quitclaim
Republic of the Philippines) / Province of Pangasinan) / City of San Carlos) S.S.
"I, `[name]`, of legal age, Filipino, single/married, presently residing at `[address]`… depose and state that:"
"voluntarily resigned as `[position]` of J & J Trading OPC."
"received from my employer the sum of `[amount]` which is full and final satisfaction of my salary and other benefits…"
Fixed waiver paragraphs (no claims; voluntary; read & understood).
"IN WITNESS THEREOF… this `[date]` in Tandoc, San Carlos City, Pangasinan." Affiant `[signature]`. Notary block: Doc No / Page No / Book No / Series No.

## 5. COE — Certificate of Employment
"CERTIFICATE OF EMPLOYMENT. This is to certify that `[Mr./Ms.]` `[full name]` was an employee of **J&J Trading OPC** as a `[position]` from `[start date]` to `[end date]`. This certificate is being issued upon the request of `[name]` for whatever legal purposes it may serve. Issued this `[date]` at Brgy. Tandoc, San Carlos City, Pangasinan." Signatory: **Edgardo S. Castro, President**.
(Original used "Beyond Limits Development Corporation (Helium Fuels)" — override to J&J Trading OPC per Best.)

## 6. Clearance Form
Title CLEARANCE FORM. Employee Name `[__]`, Employee ID No `[__]`, Employment Date `[__]`, Separation Date `[__]`, Current position `[__]`.
"Requirement prior to separation: Obtain all signatures and forward to HR." Signature routing table (Date | Department/Position | Employee Responsibilities/Remarks | Signature) for: **TL, Cluster Officer, Audit, Accounting Department, ACS, HR Department, Management, EC1/EC2.** Employee signature over printed name + date. Received by: HR Department.

## 7. Accountability Form
Title ACCOUNTABILITY FORM. Employee `[__]`, Date `[__]`, Position `[__]`, Department `[__]`.
Equipment/Machine/Fixed Asset table: **UNIT | MODEL | QTY | SERIAL NUMBER | REMARKS**.
Ack: "I have received the above item(s) on `[date]` at `[location]`. I acknowledge that I am accountable… I will pay or replace the unit in case of loss or damage due to my fault or negligence."
Conformed / Approved by / Witnessed by (signature over printed name).

## 8. Probationary Employment Contract (J&J Trading OPC)
Long legal contract. Effective `[date]` at San Carlos City, Pangasinan. EMPLOYER = J&J Trading OPC (office No. 1 Brgy Tandoc), represented by VP **Agnes C. Salvador**. EMPLOYEE = `[name]`, residing `[address]`. Position `[GAS ATTENDANT]`. Basic Pay `[₱505]`/day, payable end of week, 45% take-home ruling. Term **6 months**.
Clauses (keep verbatim): Designation & Status, Duties, Compensation & Benefits, Manner of Performance (≤8h/day), Compliance with Policies, Payroll Deductions, Benefits Processing, Training Investment, Confidentiality, Data Sharing, Indemnity, Termination, Effectivity (6 mo), Accountability/Return of Property, Written Consent to Bind, Dispute Resolution (Arbitration/ADR).

## 9. Apprenticeship Agreement (J&J Trading OPC)
Executed `[date]`, San Carlos City. Company = J&J Trading OPC (1 Calem St. Brgy Tandoc). THE APPRENTICE = `[name]`, resident `[address]`. Allowance **Php 300/day**, released weekly. Term `[start]` to `[end]`, guaranteed 3 days duty/week, on-call.
Fixed clauses: no employer-employee relationship; not entitled to mandated benefits until employee; assessed at end for probationary; company may terminate for violations. Signatory: **Edgardo S. Castro, President**. "Signed in the presence of."

## 10. End of Contract – Apprentice
Date `[__]` / To `[apprentice]` / From: HR Department / Subject: End of Apprenticeship Agreement.
"The following violations in our Code of Discipline, this confirms our decision to end your Apprenticeship Agreement… effective Immediately:" Table: DATE | INCIDENT | COD VIOLATION.
Fixed termination paragraph (company right to terminate before training period ends for violations). Prepared by: **Rojelyn V. De Vera, HR Operations Specialist**. Acknowledge receipt: Signature over printed name `[__]`, Date `[__]`, Time `[__]`.

## 11. EMR — Employee Movement Report
Header: Human Resources Department / Employee Movement Report Form. Employee `[__]`, Employee Number `[__]`, Date Hired `[__]`, Effective Date `[__]`, Date of Birth `[__]`, SSS/PhilHealth/HDMF/TIN `[__]`.
Movement Type (checkboxes): Probationary, Regular, Promotion, Salary Alignment, Developmental Assignment, Revert to Latest Post, Relocation, Transfer of Assignment.
FROM | TO grid: Branch, Position Title, Department, Employee Status, Basic Salary, Gas Allowance, Working Hours, TOTAL, REMARKS.
Prepared by `[__]` / Approved by (JR HR Business Partner / Management) / Received by `[employee]`.

## 12. Leave Application Form — TEMPLATE PENDING
Original is a PDF that couldn't be extracted (no PDF tooling in that session). **Ask Best to resend as .docx or photo.** Interim standard fields: employee, dates from–to, # of days, leave type (SIL/VL/SL/Emergency/Maternity/Paternity), reason, leave balance, Prepared/Approved/Received.

---
Source templates: Best's .docx/xlsx (July 2026). This spec is the source of truth for the forms build.
