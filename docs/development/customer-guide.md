# CareOS — Customer Portal & Fleet Management Guide

> **Target Audience:** Customer Fleet Managers, Logistics Directors, and Authorized Client Representatives  
> **Scope:** Self-service fleet asset tracking, service request submission, real-time ticket tracking, quotation approvals, payment processing, service history, and CareOS Assist AI.

---

## 1. Accessing Your Customer Portal

1. Navigate to:
   ```
   https://<DOMAIN>/login
   ```
2. Sign in with your registered email and password.
3. You will enter the **Customer Workspace** (`/customer`), which is strictly isolated to your organization's assets and tickets.

---

## 2. Fleet Asset Overview

Navigate to `/customer/assets` to view all vehicles and equipment enrolled with CareOS:
- **Vehicle Identifier:** Plate Number, Fleet Number, and Vehicle Identification Number (VIN).
- **Installed Equipment:** Model of Mobile Digital Video Recorders (MDVR), driver safety cameras (DMS/ADAS), and GPS sensors.
- **Warranty Status:** Real-time indication whether hardware is under active warranty or out-of-warranty.
- **Service History:** Click any asset to review its complete history of maintenance, repairs, and replaced parts.

---

## 3. Submitting a Support or Maintenance Request

1. Navigate to `/customer/tickets` and click **New Service Request**.
2. Complete the request form:
   - **Select Asset:** Choose the affected vehicle or device from your fleet list (or select *General Inquiry*).
   - **Service Category:** e.g., *Camera Offline*, *Screen Black*, *Power Fault*, *Scheduled Maintenance*.
   - **Title & Description:** Describe the observed symptoms (e.g., *"Front camera feed intermittent after heavy rain"*).
   - **Site Location:** Choose the depot or branch where the vehicle is located.
   - **Attachment:** Attach an optional photo of the fault.
3. Click **Submit Request**.
4. The system immediately assigns an immutable tracking number (e.g. `TCK-2026-00105`) and queues your ticket for triage.

---

## 4. Live Progress Tracking & Real-Time Updates

CareOS delivers live, stage-by-stage status updates directly to your screen without needing to refresh:
- **Triage & Review:** Operations is verifying warranty and assigning an engineer.
- **Assigned:** A certified technician has been scheduled for your request.
- **En Route / On Site:** The technician has checked in at your facility.
- **In Progress:** Repair or calibration is actively underway.
- **Resolved:** Work is complete, verified with diagnostic photo evidence.

You can post messages in the **Ticket Activity** feed to communicate directly with the service desk.

---

## 5. Reviewing & Approving Quotations

For out-of-warranty or non-contract service, Operations will prepare a digital quotation:
1. Navigate to `/customer/quotations` (you will also receive an email notification).
2. Click the quotation to inspect the transparent price breakdown:
   - **Labour Charges:** Number of technician hours and hourly rate.
   - **Replacement Parts:** Part name, part SKU, unit price, and quantity.
   - **Subtotal & Discounts:** Any corporate volume discounts applied.
   - **15% KSA VAT:** Clearly itemized tax amount.
   - **Grand Total:** Final payable amount.
3. Choose your action:
   - **Approve Quotation:** Confirms authorization. The ticket is immediately queued for technician dispatch.
   - **Reject Quotation:** If you choose not to proceed, select a rejection reason (e.g., *Budget Constraint*, *Vehicle Decommissioned*). Operations will close the ticket without charge.

---

## 6. Filing a Service Complaint

If service delivery failed to meet your satisfaction:
1. Navigate to `/customer/complaints` and click **Submit Complaint**.
2. Select Category:
   - **Service Quality:** Technician late, work unsatisfactory, or site left untidy. Link to the specific ticket number.
   - **Platform & Invoicing:** Billing inquiry or account access issue.
3. Provide details and submit.
4. Your complaint is routed directly to senior management and tracked through an independent resolution process.

---

## 7. Knowledge Base & CareOS Assist AI

Before submitting a ticket, you can resolve common issues in seconds:
1. Navigate to `/customer/knowledge`.
2. Browse approved operating manuals, camera LED indicator charts, and self-troubleshooting guides.
3. Click the **CareOS Assist** chat bubble in the bottom right corner:
   - Ask questions like: *"Why is the green LED blinking on my MDVR?"* or *"What is the warranty period for camera brackets?"*
   - CareOS Assist provides instant answers citing verified product documentation.
   - AI cannot approve invoices, close tickets, or view another customer's data. If needed, the AI can draft a support ticket for you.
