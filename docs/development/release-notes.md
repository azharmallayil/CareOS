# CareOS — Version 1.0.0 Release Notes

> **Release Version:** `v1.0.0-GA`  
> **Release Date:** November 2026  
> **Target Production Architecture:** Hostinger Managed Node.js + OCI Always Free ARM64 Worker + Supabase Cloud Singapore  
> **Build Status:** Verified (14 Test Suites, 192 Tests Passing, 8 Playwright E2E Tests Passing, 0 Failures)

---

## 1. Executive Summary

CareOS v1.0.0 is an enterprise-grade field service, fleet telematics, commercial maintenance, and support desk platform tailored for mission-critical fleet operators, MDVR/camera hardware integrators, and commercial service delivery organizations.

The system is built on a resilient three-tier decoupled architecture:
1. **Stateless Web & API Tier:** Fastify 4.x running on Hostinger Managed Node.js serving both the React 18 single-page application and RESTful `/api/v1/*` endpoints from a single origin.
2. **Asynchronous Background Processing Tier:** OCI Always Free Ampere A1 (ARM64) Docker worker executing SLA breach monitoring, durable ERP outbox synchronization, telematics event normalization, and dead-letter queues.
3. **Data & Storage Tier:** Supabase Cloud Singapore (`ap-southeast-1`) hosting PostgreSQL 15 with 100% Row-Level Security across 70 tables, private encrypted storage buckets, and Supabase Realtime subscriptions.

---

## 2. Comprehensive Implementation Changelog (Steps 1–20)

### Foundation & Multi-Tenant Security (Steps 1–6)
- **Multi-Tenant Database Engine:** 18 sequential migrations (`20261115000001` to `20261115000018`) establishing private schema `app_private` and public domain tables.
- **100% Row-Level Security:** 70 public tables secured with RLS. The `anon` role has zero SELECT/INSERT/UPDATE/DELETE privileges across the entire schema.
- **Tenant Isolation:** Hierarchical tenant scoping (`tenant_id`) enforced across all API routes via Fastify `requireAuth` and `requireTenant` middleware.
- **Role-Based Access Control (RBAC):** Customizable permission matrix (`packages/permissions`) with system roles (*Platform Admin*, *Tenant Admin*, *Operations Manager*, *Dispatcher*, *CSR*, *Field Technician*, *Customer User*).
- **Customer & Site Registry:** Customer accounts, contact rosters, and branch depot geofences (`latitude`, `longitude`).

### Asset Registry & Hardware Traceability (Steps 7–8)
- **Asset Registry:** Tracking fleet vehicles (VIN, plate, fleet number) and connected hardware (MDVR units, ADAS/DMS cameras, panic buttons, fuel sensors).
- **Traceable Assignments:** Historical assignments tracking device movement between vehicles and warehouses without overwriting service history.

### Support Desk & Complaints Lifecycle (Step 9)
- **Transactional Numbering:** Concurrency-safe, immutable ticket numbering (`TCK-YYYY-XXXXX`) generated via row locks on sequence counters.
- **Support Desk Lifecycle:** Role-based transitions (`open` -> `in_progress` -> `resolved` -> `closed` / `cancelled`) with mandatory transition reasons and actor audit stamps.
- **Independent Complaints Module:** Separate lifecycle for service and platform complaints, linked to tickets without corrupting ticket event logs.

### Commercial Coverage Engine & Quotations (Step 10)
- **Four-Way Coverage Engine:** Automated classification into *Warranty*, *Contract-Covered*, *Free Service*, and *Paid Service*.
- **Versioned Quotations:** Parts and labour line items with volume discounts and automated **15% KSA VAT** computation.
- **Payment Verification Gate:** Paid tickets cannot become *Ready for Assignment* until payment is verified server-side with HMAC-signed webhooks, or an authorized *Commercial Override* exception is issued.

### Field Dispatch, Work Orders & Evidence (Steps 11–12)
- **Ranked Dispatch Engine:** Automated multi-criteria ranking based on certified skills, service territories, active workload, and geographic proximity.
- **Mobile Work Orders:** 4-stage execution (*Arrival Check-In*, *Diagnosis*, *Execution*, *Check-Out*) with digital checklists and service visit outcome logging.
- **Approved Rejection Reasons:** Mandatory structured rejection codes (`schedule_conflict`, `territory_mismatch`, etc.) alerting operations and returning tickets to the dispatch queue.
- **Presigned Evidence Storage:** Photos, videos, and diagnostic reports upload directly to Supabase private storage via signed tokens, bypassing Hostinger server memory.
- **Bulk Service Campaigns:** Coordinated parent campaign envelope managing individual single-asset tickets and work orders for fleet-wide campaigns.

### Maintenance, Warranty/RMA & Inventory (Step 13)
- **Preventive Maintenance Plans:** Mileage and calendar-based recurring service schedules.
- **RMA Lifecycle:** Hardware return cases, supplier authorizations, and replacement tracking.
- **Immutable Inventory Ledgers:** Parts catalogue, multi-location stock tracking, and permanent audit movements (`stock_movements`) protected by database triggers.

### SLA Engine & Service Intelligence (Step 14)
- **Dynamic SLA Calculations:** Separate tracking for *Response Time* and *Resolution Time* with automatic clock pausing during customer quotation reviews or parts waiting.
- **Background Worker Engine:** Dedicated OCI worker evaluating SLA breaches every 60 seconds with Level 1 and Level 2 escalations.
- **Service Intelligence Dashboards:** Real-time visibility into SLA compliance rates, average turnaround time, and technician workload.

### ERP & Telematics Integrations (Step 15)
- **Generic REST ERP Connector:** Transactional outbound outbox (`outbound_event_outbox`) with exponential backoff, jitter, and dead-letter queues.
- **Telematics Inbound Webhook Ingestion:** Ingestion inbox with HMAC-SHA256 signature verification, event deduplication, and automated fault alert conversion (e.g., MDVR camera offline alerts).

### Reporting UX, Search & AI Knowledge Base (Steps 16–17)
- **Compound Database Indexes:** Compound B-tree and GIN indexes across high-traffic foreign keys and timestamps.
- **Role-Scoped Global Search:** `Cmd+K` command palette searching tickets, assets, and customers with strict tenant and role boundaries.
- **CareOS Assist AI Gateway:** Provider-independent AI gateway with prompt injection defenses, audience isolation (`customer` vs `internal`), and deterministic fallback. Consequential actions (approval/closure) require human approval.

### API Completeness & Security Hardening (Steps 18–20)
- **Hostinger Runtime Compliance:** Bounded request timeouts (15s connection / 30s request), dynamic `PORT` reading, and zero in-process background loops.
- **Mobile Technician API:** Dedicated `GET /api/v1/technicians/me` bootstrap endpoint and complete OpenAPI 3.0.3 specification (`/api/v1/openapi.json` and `/documentation`).
- **Comprehensive Security Hardening:** RLS enabled on `payment_webhook_events`, explicit `search_path` on all functions, and `enforce_ledger_immutability()` database triggers.
- **Production Deployment Artifacts:** Automated build scripts, ARM64 multi-stage Dockerfile, Docker Compose definitions, and rollback runbooks.

---

## 3. Verification & Test Metrics

- **Unit & Integration Test Suites:** 14 test suites comprising **192 automated tests passed with 0 failures**:
  - `standalone-auth-test.mjs` (Auth & session security)
  - `step5-organization.test.mjs` (Tenants, branches, RBAC)
  - `step6-customers.test.mjs` (Customer accounts, sites, contacts)
  - `step7-assets.test.mjs` (Asset registry, telemetry, warranty)
  - `step9-tickets.test.mjs` (Support desk, numbering, complaints)
  - `step10-commercial.test.mjs` (Coverage engine, quotations, payments)
  - `step11-step12-dispatch-evidence.test.mjs` (Technicians, dispatch, evidence, bulk service)
  - `step13-maintenance-inventory.test.mjs` (Maintenance, RMA, stock movements)
  - `step14-sla-worker-intelligence.test.mjs` (SLA engine, OCI worker, metrics)
  - `step15-integrations.test.mjs` (ERP outbox, telematics normalization)
  - `step16-reports-search.test.mjs` (Global search, role-scoped reporting)
  - `step17-ai-knowledge.test.mjs` (CareOS Assist AI, knowledge base)
  - `step18-api-performance.test.mjs` (API envelope, mobile endpoints, Hostinger timeouts, OpenAPI)
  - `step19-security-reliability.test.mjs` (RLS, audit immutability, leases, crash recovery)
- **End-to-End Browser Tests:** **8/8 Playwright tests passed** in Google Chrome covering portal isolation, login security, and mobile viewports.
- **Static Type Safety:** `tsc --noEmit` verified with 0 errors across `apps/api`, `apps/worker`, and `apps/web`.
- **Frontend Production Build:** Vite production bundle generated cleanly in 2.61s (`apps/web/dist`).

---

## 4. Known Limitations & Deferred Beyond V1

1. **Native Mobile Technician App:** V1 provides a fully responsive mobile web app (PWA) with complete OpenAPI 3.0 backend endpoints. A native Flutter/React Native mobile application is deferred to V2.
2. **Vendor-Specific ERP Adapters:** V1 implements the generic REST ERP outbox contract. Vendor-specific pre-built connectors (e.g. SAP Business One, Oracle NetSuite) will be deployed as micro-connectors in future iterations.
3. **Advanced Geospatial Background Tracking:** Continuous GPS tracking while the browser is closed is not supported in web browsers; technician location pings operate only while the technician portal tab remains active.
