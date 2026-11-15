# CareOS — Field Technician Mobile & Web Portal Guide

> **Target Audience:** Field Service Technicians  
> **Scope:** Mobile portal workflows, daily assignments, work order acceptance/rejection, stage progression, evidence capture, parts consumption, and check-in/check-out.

---

## 1. Accessing the Technician Portal

1. Open your mobile browser (Safari on iOS or Chrome on Android) and navigate to:
   ```
   https://<DOMAIN>/login
   ```
2. Log in with your technician credentials.
3. You will be automatically routed to the **Technician Portal** (`/technician`).
4. You can tap **Add to Home Screen** in your mobile browser to install CareOS as a Progressive Web App (PWA) with a dedicated app icon.

---

## 2. Daily Dashboard & Work Orders

Upon logging in, your daily overview displays:
- **Active Work Orders Count:** Number of jobs assigned to you for today.
- **Assigned Territory & Zone:** Your current operational zone (e.g. *Riyadh North*).
- **Work Order Queue:** Cards sorted by scheduled time window and priority (*Critical*, *High*, *Medium*, *Low*).

---

## 3. Work Order Acceptance & Rejection

When Operations assigns a new work order to you:
1. Tap the work order card to view customer name, site address, vehicle VIN, and reported fault.
2. Choose one of two actions:
   - **Accept Work Order:** Tap **Accept**. Status transitions to `accepted`. Operations is notified that you have committed to the job.
   - **Reject Work Order:** If you cannot take the assignment, tap **Reject**. You must select an **Approved Rejection Reason**:
     - *Schedule Conflict*
     - *Territory Mismatch*
     - *Skill Mismatch*
     - *Emergency Leave*
     - *Vehicle Breakdown*
     - *Parts Unavailable*
     - *Other (requires written explanation)*
   - Tapping Confirm Rejection immediately returns the ticket to Operations for reassignment.

---

## 4. Work Order Stages & Execution

Once accepted, tap **Start Job** when en route or arriving on site. CareOS tracks jobs across four mandatory stages:

```
+─────────────────────+     +─────────────+     +─────────────+     +──────────────+
| 1. Arrival Check-In | ──> | 2. Diagnosis | ──> | 3. Execution | ──> | 4. Check-Out |
+─────────────────────+     +─────────────+     +─────────────+     +──────────────+
```

### Stage 1: Arrival & Check-In
- Tap **Check In** when you physically arrive at the customer site.
- The system timestamps your actual arrival time and updates the work order status to `on_site`.
- Review customer site contact name and contact phone number.

### Stage 2: Diagnosis & Pre-Service Inspection
- Inspect the asset (e.g., MDVR power cable, camera alignment, GPS antenna).
- Complete the digital **Pre-Service Checklist** (e.g., *Power LED steady green?*, *Ignition wire connected?*).
- Upload diagnostic photos showing initial condition and serial numbers.

### Stage 3: Execution & Parts Consumption
- Perform the repair, firmware flash, or hardware installation.
- **Log Replaced Parts:**
  1. Scroll down to the **Parts Used** section.
  2. Select the part SKU from your van stock (e.g., *MDVR Camera Sensor Bracket*).
  3. Enter the quantity used and tap **Record Part Usage**.
  4. This immediately updates inventory traceability for warranty and stock reconciliation.

### Stage 4: Check-Out & Customer Sign-Off
- Verify all checklists are marked complete.
- Upload post-repair evidence photos (e.g., active camera stream, neat cabling).
- Record service visit outcome:
  - *Successful (Job Completed)*
  - *Partial (Follow-up Visit Needed)*
  - *Parts Needed*
  - *Customer Rescheduled*
- Tap **Complete & Check Out**.

---

## 5. Capturing & Uploading Service Evidence

Quality assurance requires visual evidence before a job can be closed:
1. Under the **Evidence** tab, tap **Add Evidence Photo**.
2. Tap **Take Photo** to launch your device camera (or select from gallery).
3. Select evidence category:
   - *Arrival Condition*
   - *Damaged Component*
   - *Completed Installation*
   - *Odometer / Serial Number Reading*
4. Tap **Upload**. The photo is transferred securely to private encrypted cloud storage via presigned tokens.

---

## 6. Location Sharing & Privacy Rules

CareOS respects technician privacy:
- **Opt-In Only:** Location sharing only runs if you tap **Enable Location Sharing**.
- **Active Browser Tab Only:** Location coordinates are sent **only while the CareOS technician portal tab is actively open in your browser**.
- **No Background Tracking:** CareOS does not track your personal location in the background or outside working hours.
- **Customer Privacy:** Customers only see estimated technician arrival horizons, never raw personal location history.

---

## 7. Low-Connectivity / Offline Tips

If working in underground parking garages, remote desert highways, or shielded metal warehouses with poor cell reception:
1. Load your work order details while in an area with good reception before heading underground.
2. Complete your diagnostic checklists and capture photos with your phone camera app.
3. Once back in cell coverage, tap **Upload** to sync photos and submit your checkout report.
