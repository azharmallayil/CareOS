# CareOS — Operations & Field Service Management Guide

> **Target Audience:** Operations Managers, Service Delivery Managers, Dispatchers, and Customer Support Representatives (CSRs)  
> **Scope:** Core service desk operations, asset registry, ticket lifecycles, commercial quotations, technician dispatch, inventory, SLA tracking, and operational reporting.

---

## 1. Operations Portal Navigation Overview

The Operations Portal (`/operations`) is the central control hub for managing day-to-day service delivery:

| Route | Module | Key Capabilities |
| :--- | :--- | :--- |
| `/operations/tickets` | **Support Desk** | Ticket queue, status transitions, timeline events, complaints. |
| `/operations/dispatch` | **Dispatch Queue** | Technician availability, dispatch recommendations, assignments. |
| `/operations/assets` | **Asset Registry** | Fleet vehicles, MDVR hardware, sensors, warranty status. |
| `/operations/customers` | **Customers & Sites** | Customer accounts, branch sites, geofences, contacts. |
| `/operations/quotations` | **Commercial Engine** | Parts & labour quotations, 15% VAT, payments, overrides. |
| `/operations/bulk-service` | **Bulk Campaigns** | Multi-vehicle maintenance campaigns (1 ticket per asset). |
| `/operations/inventory` | **Parts & Stock** | Catalogue, stock locations, transfers, immutable movements. |
| `/operations/intelligence` | **SLA & Analytics** | SLA compliance, technician workload, volume trends. |
| `/operations/reports` | **Reports & Exports** | Role-scoped aggregate metrics, CSV/JSON exports. |

---

## 2. Customer Accounts & Asset Registry

### 2.1 Customer Accounts & Branch Sites
- All assets and tickets belong to a verified **Customer Account** (`/operations/customers`).
- **Customer Sites:** Physical locations (depots, warehouses, yards) with address, city, and GPS coordinates (`latitude`, `longitude`). Sites are used by the dispatch engine to calculate travel distances.

### 2.2 Asset Registry
- Located at `/operations/assets`.
- **One Asset = One Service Unit:** In V1, each vehicle, MDVR unit, camera, or sensor has its own unique asset record with VIN / Serial Number, category, and warranty dates.
- **Service History:** Every ticket, work order, and replaced part is permanently linked to the asset's history.

---

## 3. Support Desk & Ticket Lifecycle

CareOS tickets follow a strict, auditable lifecycle:

```
+─────────+      Dispatch      +─────────────+     Resolution     +──────────+
|  OPEN   | ─────────────────> | IN_PROGRESS | ─────────────────> | RESOLVED |
+─────────+                    +─────────────+                    +──────────+
     │                                                                 │
     │ Cancel                                                          │ Close
     ▼                                                                 ▼
+───────────+                                                     +──────────+
| CANCELLED |                                                     |  CLOSED  |
+───────────+                                                     +──────────+
```

### 3.1 Ticket Numbering & Concurrency Safety
- Numbers are formatted as `TCK-YYYY-XXXXX` (e.g. `TCK-2026-00042`).
- Generated transactionally via `app_private.generate_ticket_number` using PostgreSQL row locks on `ticket_number_sequences`. Concurrency-safe and strictly immutable.

### 3.2 Service Complaints vs. Platform Complaints
- Located at `/operations/complaints`.
- **Service Complaints:** Relate to technician delays, improper installation, or damaged parts. Linked directly to a ticket or work order.
- **Platform Complaints:** Relate to system access, UI bugs, or invoicing inquiries.
- Complaints maintain their own separate lifecycle (`submitted` -> `under_investigation` -> `resolved` -> `rejected`) without modifying the primary ticket's audit history.

---

## 4. Commercial Engine: Coverage, Quotations & Payments

Paid service tickets cannot be dispatched until payment is verified, unless an authorized commercial override is granted.

### 4.1 Service Coverage Classification
When creating or triaging a ticket, the coverage engine classifies eligibility:
1. **Warranty:** Active manufacturer or installation warranty covering defect.
2. **Contract-Covered:** Valid service contract entitlement covering asset.
3. **Free Service:** Approved promotional or goodwill entitlement.
4. **Paid Service:** Quotation required before assignment.

### 4.2 Quotation Generation & 15% VAT
1. Navigate to **Quotations** → **Create Quotation**.
2. Select Customer and Ticket.
3. Add Line Items:
   - **Labour:** Technician hours × standard hourly rate.
   - **Parts:** Select from parts catalogue (unit price auto-populated).
4. System automatically applies line discounts and **15% KSA VAT** to generate `grand_total`.
5. Quotations are versioned (`v1`, `v2`, etc.). Publishing creates a customer-visible quotation.
6. The customer receives notification to approve or reject via the Customer Portal.

### 4.3 Payment Verification & Commercial Overrides
- **Verified Payments:** Online card payments (Moyasar, Apple Pay) or bank transfers are reconciled server-side with HMAC-signed webhooks.
- **Commercial Override (Exception Gate):** If urgent dispatch is required before payment:
  - An authorized Operations Manager can issue an override (`payment_deferred`, `goodwill_warranty`, `executive_exception`).
  - Records mandatory justification reason and actor ID in `commercial_overrides`.

---

## 5. Dispatch Queue & Field Service Management

### 5.1 Ranked Dispatch Recommendations
The dispatch engine (`/operations/dispatch`) ranks eligible technicians using reliable criteria:
- **Skill Match:** Technician holds certified skill for the required service category (e.g., *MDVR Installation*, *ADAS Calibration*).
- **Territory Match:** Work order site falls within technician's assigned service territory.
- **Workload Capacity:** Technician currently has fewer active work orders than their `max_active_work_orders` limit.
- **Proximity:** Calculated distance between technician's home zone / last location and customer site.

### 5.2 Assignment & Rejection Workflows
- **Assignment:** Operations selects recommended technician and assigns work order. Status moves to `assigned`.
- **Technician Acceptance:** Technician accepts via mobile portal → status moves to `accepted`.
- **Technician Rejection:** If technician rejects, they must select an approved reason code (`schedule_conflict`, `territory_mismatch`, `skill_mismatch`, `emergency_leave`, `vehicle_breakdown`, `parts_unavailable`, `other`).
  - Rejection triggers alert to operations, creates timeline event, and returns work order to unassigned queue.

---

## 6. Service Evidence & Quality Review

- Located at `/operations/evidence`.
- Photos, videos, and diagnostic reports uploaded by field technicians are marked `pending_review`.
- Operations inspectors review each submission and mark as **Verified** or **Rejected**.
- Finalized evidence is permanently locked in Supabase private storage and cannot be altered.

---

## 7. Bulk Service Campaigns

- Located at `/operations/bulk-service`.
- Designed for fleet-wide upgrades (e.g., upgrading 100 delivery trucks with new MDVR firmware).
- **Core Principle:** The campaign serves as the parent coordination envelope, but **every individual vehicle receives its own separate ticket and work order**.
- Aggregated progress bar displays overall campaign completion while preserving per-asset service history.

---

## 8. Parts Catalogue & Stock Management

- Located at `/operations/inventory`.
- **Parts Catalogue:** SKU, part name, description, unit price, minimum stock thresholds.
- **Stock Locations:** Central warehouse, branch depots, or technician mobile van stock.
- **Immutable Movements:** Stock increases (receipts), decreases (consumption), and transfers between locations write permanent rows to `stock_movements`. Deletions and updates are blocked by database triggers.

---

## 9. SLA Monitoring & Service Intelligence

- Located at `/operations/intelligence`.
- **SLA Clock:** Tracks *Response Time* (ticket creation to technician assignment) and *Resolution Time* (ticket creation to work order completion).
- **Clock Pauses:** Clocks automatically pause while waiting for customer quotation approval (`waiting_approval`) or parts delivery (`waiting_parts`).
- **Automated Escalation:** OCI Worker evaluates breaches every 60 seconds:
  - Level 1: Operations Supervisor alerted upon response breach.
  - Level 2: Service Delivery Manager alerted upon resolution breach.
