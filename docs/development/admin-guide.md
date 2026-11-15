# CareOS — Platform & Tenant Administrator Guide

> **Target Audience:** Platform Super Administrators and Tenant Administrators  
> **Scope:** Multi-tenant configuration, organizational RBAC, platform security, tenant onboarding, integration management, and system auditing.

---

## 1. System Roles & Access Boundaries

CareOS enforces strict multi-tenant isolation and role-based access control (RBAC). Administrative authority is partitioned into two distinct tiers:

```
+───────────────────────────────────────────────────────────────────────────+
|                       PLATFORM SUPER ADMINISTRATOR                        |
| - Global visibility across all tenants                                    |
| - Tenant provisioning, subscription plan assignment                       |
| - Cross-tenant audit inspection & global platform configuration           |
+─────────────────────────────────────┬─────────────────────────────────────+
                                      │ Provisions
                                      ▼
+───────────────────────────────────────────────────────────────────────────+
|                            TENANT ADMINISTRATOR                           |
| - Scoped strictly to single tenant (tenant_id)                            |
| - Organizational structure (departments, roles, permissions)              |
| - User management & invitations                                           |
| - Integration configurations (ERP, Telematics, Webhooks)                  |
| - AI Gateway & Knowledge Base governance                                  |
+───────────────────────────────────────────────────────────────────────────+
```

---

## 2. Platform Administration (`/admin`)

The Platform Admin Portal is accessible only to users explicitly registered in `public.platform_admins`.

### 2.1 Tenant Provisioning
1. Navigate to `/admin/tenants`.
2. Click **Create New Tenant**.
3. Provide:
   - **Tenant Name:** e.g., `Alpha Fleet Care LLC`.
   - **Tenant Slug:** Unique alphanumeric identifier (e.g., `alpha-fleet`).
   - **Subscription Plan:** `enterprise` or `professional`.
   - **Primary Contact Email:** Initial tenant owner email.
4. Upon creation, database trigger `handle_new_tenant_bootstrap` automatically seeds:
   - Default departments: *Operations*, *Customer Support*, *Field Service*.
   - Default roles: *Tenant Admin*, *Operations Manager*, *Dispatcher*, *CSR*, *Field Technician*, *Customer User*.
   - Default ticket sequence counter initialized at `1`.

### 2.2 Global Audit Logs
- Navigate to `/admin/audit-logs` to inspect platform-wide actions.
- Audit records are immutable: timestamps, actor IDs, actions, and IP addresses cannot be modified or deleted.

---

## 3. Tenant Administration (`/operations/settings`)

Tenant Administrators configure organizational policies, users, and integrations for their specific organization.

### 3.1 Department & Role Management
- Navigate to **Settings** → **Organization & Roles**.
- **Departments:** Group users by functional area (e.g., Central Workshop, Mobile Fleet Dispatch).
- **Custom Roles:** Define custom permission sets by toggling specific permissions across modules:
  - `tickets:create`, `tickets:edit`, `tickets:assign`, `tickets:close`
  - `quotations:create`, `quotations:approve`, `quotations:override`
  - `inventory:adjust`, `inventory:transfer`
  - `reports:export`

### 3.2 User Invitations & Lifecycle
CareOS does **not** permit open public registration. All users are added via secure invitations:
1. Navigate to **Settings** → **Users & Invitations**.
2. Click **Invite User**.
3. Enter email address, assign portal access (`operations`, `technician`, or `customer`), and assign default role(s).
4. The system generates a cryptographically random, 256-bit entropy token valid for 7 days.
5. The recipient receives an invitation link (`https://<DOMAIN>/accept-invitation?token=...`).
6. Upon acceptance, the user sets their password, and the token is permanently marked `accepted`.

### 3.3 Deactivating Users
- To revoke access, toggle user status to **Inactive**.
- Active sessions are immediately invalidated by Supabase Auth and Fastify token verification.

---

## 4. Integration Management (`/operations/integrations`)

Tenant Administrators manage external data exchanges via the generic integration framework.

### 4.1 Telematics Webhook Configuration
1. Navigate to **Integrations** → **Add Connection** → **Telematics**.
2. Configure:
   - **Provider Code:** e.g., `generic-telematics`, `geotab`, `cartrack`.
   - **HMAC Webhook Secret:** High-entropy secret for SHA-256 signature verification.
3. The generated webhook URL is:
   ```
   https://<DOMAIN>/api/v1/integrations/telematics/webhook?connectionId=<UUID>
   ```
4. Inbound webhooks require header `X-CareOS-Signature` matching HMAC-SHA256 of the raw payload.

### 4.2 ERP Outbound Connector
1. Navigate to **Integrations** → **Add Connection** → **ERP**.
2. Configure:
   - **Base URL:** e.g., `https://erp.customer.com/api/v1`.
   - **Auth Type:** `bearer_token` or `api_key`.
   - **Credentials:** API token or key (stored securely; masked in UI).
3. The OCI Background Worker automatically polls `outbound_event_outbox` and synchronizes customer, invoice, and parts data with exponential backoff and dead-letter queueing.

---

## 5. CareOS Assist AI Configuration (`/operations/knowledge`)

CareOS features a provider-independent AI Gateway:
- **Provider Adapters:** `none` (default deterministic fallback), `gemini`, `ollama`.
- **Audience Isolation:** Knowledge articles must be classified as `customer`, `internal`, or `all`.
- **Security Guardrails:** AI cannot approve quotations, close tickets, or override warranties. Consequential actions require explicit human approval.
- **Prompt Injection Defense:** User inputs and retrieved manuals are treated as untrusted strings.

---

## 6. Security & Compliance Checklist for Administrators

- [ ] Verify two-factor authentication (2FA) is enforced on platform admin accounts.
- [ ] Ensure `SUPABASE_SERVICE_ROLE_KEY` is never shared or added to client-side code.
- [ ] Review export audit logs periodically (`/operations/reports`) for anomalous bulk downloads.
- [ ] Monitor dead-letter queues (`/operations/integrations`) for failed ERP synchronization attempts.
