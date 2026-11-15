import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createAdminClient } from "@careos/supabase-client";
import { requireAuth, requirePlatformAdmin } from "../middleware/guards.js";

const createTenantSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase alphanumeric characters and single hyphens"),
  plan: z.enum(["starter", "professional", "enterprise"]).default("enterprise"),
  status: z.enum(["trial", "active", "suspended", "cancelled"]).default("active"),
  legalName: z.string().optional(),
  commercialRegister: z.string().optional(),
  taxId: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  addressLine1: z.string().optional(),
  subscriptionValidUntil: z.string().nullable().optional(),
  isUnlimitedValidity: z.boolean().default(true),
  notes: z.string().optional(),
  adminFullName: z.string().min(2).max(100).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
  status: z.enum(["trial", "active", "suspended", "cancelled"]).optional(),
  legalName: z.string().nullable().optional(),
  commercialRegister: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  country: z.string().optional(),
  city: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  subscriptionValidUntil: z.string().nullable().optional(),
  isUnlimitedValidity: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const uploadDocumentSchema = z.object({
  documentType: z.enum([
    "commercial_registration",
    "telematics_license",
    "tax_certificate",
    "sla_contract",
    "brand_logo",
    "other",
  ]),
  title: z.string().min(2).max(150),
  fileName: z.string().min(1).max(255),
  fileData: z.string().min(1, "File payload is required"), // Base64 data URL
  fileSizeBytes: z.number().optional(),
  mimeType: z.string().optional(),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  const adminClient =
    supabaseUrl && supabaseServiceKey
      ? createAdminClient(supabaseUrl, supabaseServiceKey)
      : null;

  // Protect all /admin routes with Platform Super Admin guard
  fastify.addHook("preHandler", requireAuth);
  fastify.addHook("preHandler", requirePlatformAdmin);

  // --------------------------------------------------------------------------
  // 1. LIST TENANTS (WITH OFFICIAL DETAILS & STATS)
  // --------------------------------------------------------------------------
  fastify.get("/tenants", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { data: tenants, error } = await adminClient
      .from("tenants")
      .select(`
        id, slug, name, plan, status, 
        legal_name, commercial_register, tax_id, contact_email, contact_phone, website,
        country, city, address_line1, subscription_valid_until, is_unlimited_validity,
        notes, created_at, updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      fastify.log.error(error, "Failed to fetch platform tenants");
      return reply.status(500).send({
        error: { code: "FETCH_TENANTS_FAILED", message: error.message },
      });
    }

    return reply.send({ data: tenants || [] });
  });

  // --------------------------------------------------------------------------
  // 2. GET SINGLE TENANT (WITH ADMIN USERS & DOCUMENTS)
  // --------------------------------------------------------------------------
  fastify.get("/tenants/:id", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { id } = request.params as { id: string };

    const { data: tenant, error } = await adminClient
      .from("tenants")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !tenant) {
      return reply.status(404).send({
        error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" },
      });
    }

    // Fetch tenant documents
    const { data: documents } = await adminClient
      .from("tenant_documents")
      .select("id, document_type, title, file_name, file_size_bytes, mime_type, file_data, created_at, notes")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false });

    // Fetch tenant operations admins
    const { data: memberships } = await adminClient
      .from("tenant_memberships")
      .select("id, user_id, portal, is_active, created_at")
      .eq("tenant_id", id)
      .eq("portal", "operations");

    let adminUsers: any[] = [];
    if (memberships && memberships.length > 0) {
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, email, full_name, role")
        .in("id", userIds);

      adminUsers = memberships.map((m) => {
        const prof = profiles?.find((p) => p.id === m.user_id);
        return {
          membershipId: m.id,
          userId: m.user_id,
          email: prof?.email || "Unknown Email",
          fullName: prof?.full_name || "Company Admin",
          portal: m.portal,
          isActive: m.is_active,
          createdAt: m.created_at,
        };
      });
    }

    return reply.send({
      data: {
        ...tenant,
        documents: documents || [],
        adminUsers,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 3. CREATE / PROVISION NEW TELEMATICS COMPANY (TENANT)
  // --------------------------------------------------------------------------
  fastify.post("/tenants", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const parseResult = createTenantSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid tenant data",
          details: parseResult.error.flatten(),
        },
      });
    }

    const payload = parseResult.data;

    // Check slug uniqueness
    const { data: existingSlug } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", payload.slug)
      .maybeSingle();

    if (existingSlug) {
      return reply.status(409).send({
        error: {
          code: "SLUG_ALREADY_EXISTS",
          message: `A telematics company with slug "${payload.slug}" already exists`,
        },
      });
    }

    // Insert tenant record
    const { data: newTenant, error: insertError } = await adminClient
      .from("tenants")
      .insert({
        name: payload.name,
        slug: payload.slug,
        plan: payload.plan,
        status: payload.status,
        legal_name: payload.legalName ?? payload.name,
        commercial_register: payload.commercialRegister ?? null,
        tax_id: payload.taxId ?? null,
        contact_email: payload.contactEmail ?? payload.adminEmail ?? null,
        contact_phone: payload.contactPhone ?? null,
        website: payload.website ?? null,
        city: payload.city ?? "Riyadh",
        address_line1: payload.addressLine1 ?? null,
        subscription_valid_until: payload.isUnlimitedValidity ? null : payload.subscriptionValidUntil ?? null,
        is_unlimited_validity: payload.isUnlimitedValidity,
        notes: payload.notes ?? null,
      })
      .select("*")
      .single();

    if (insertError || !newTenant) {
      fastify.log.error(insertError, "Failed to create new tenant");
      return reply.status(500).send({
        error: { code: "TENANT_CREATION_FAILED", message: insertError?.message || "Failed to create tenant" },
      });
    }

    let provisionedAdmin: { userId: string; email: string; fullName: string } | null = null;

    // Provision Initial Tenant Admin User if email provided
    if (payload.adminEmail) {
      const email = payload.adminEmail.toLowerCase().trim();
      const fullName = payload.adminFullName || `${payload.name} Admin`;
      const password = payload.adminPassword || "CareOS@2026!";

      try {
        let userId: string;

        const { data: createUserRes, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

        if (createAuthError) {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existing = listData?.users.find((u) => u.email?.toLowerCase() === email);
          if (existing) {
            userId = existing.id;
          } else {
            throw createAuthError;
          }
        } else {
          userId = createUserRes.user.id;
        }

        // Fetch tenant_admin role ID
        const { data: adminRole } = await adminClient
          .from("roles")
          .select("id")
          .eq("tenant_id", newTenant.id)
          .eq("name", "tenant_admin")
          .maybeSingle();

        // Create operations portal membership
        const { data: membership, error: memError } = await adminClient
          .from("tenant_memberships")
          .insert({
            tenant_id: newTenant.id,
            user_id: userId,
            portal: "operations",
            is_active: true,
          })
          .select("id")
          .single();

        if (adminRole && membership && !memError) {
          await adminClient.from("membership_roles").insert({
            membership_id: membership.id,
            role_id: adminRole.id,
            tenant_id: newTenant.id,
          });
        }

        provisionedAdmin = {
          userId,
          email,
          fullName,
        };
      } catch (err: any) {
        fastify.log.warn(err, "Tenant created but initial admin user provisioning encountered an issue");
      }
    }

    return reply.status(201).send({
      data: {
        tenant: newTenant,
        admin: provisionedAdmin,
        loginUrl: "/operations",
      },
      message: `Telematics company "${newTenant.name}" successfully created and provisioned!`,
    });
  });

  // --------------------------------------------------------------------------
  // 4. UPDATE TENANT OFFICIAL DETAILS & SUBSCRIPTION VALIDITY
  // --------------------------------------------------------------------------
  fastify.patch("/tenants/:id", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { id } = request.params as { id: string };
    const parseResult = updateTenantSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid update data", details: parseResult.error.flatten() },
      });
    }

    const payload = parseResult.data;
    const updateData: Record<string, any> = {};

    if (payload.name !== undefined) updateData["name"] = payload.name;
    if (payload.slug !== undefined) updateData["slug"] = payload.slug;
    if (payload.plan !== undefined) updateData["plan"] = payload.plan;
    if (payload.status !== undefined) updateData["status"] = payload.status;
    if (payload.legalName !== undefined) updateData["legal_name"] = payload.legalName;
    if (payload.commercialRegister !== undefined) updateData["commercial_register"] = payload.commercialRegister;
    if (payload.taxId !== undefined) updateData["tax_id"] = payload.taxId;
    if (payload.contactEmail !== undefined) updateData["contact_email"] = payload.contactEmail;
    if (payload.contactPhone !== undefined) updateData["contact_phone"] = payload.contactPhone;
    if (payload.website !== undefined) updateData["website"] = payload.website;
    if (payload.country !== undefined) updateData["country"] = payload.country;
    if (payload.city !== undefined) updateData["city"] = payload.city;
    if (payload.addressLine1 !== undefined) updateData["address_line1"] = payload.addressLine1;
    if (payload.notes !== undefined) updateData["notes"] = payload.notes;

    if (payload.isUnlimitedValidity !== undefined) {
      updateData["is_unlimited_validity"] = payload.isUnlimitedValidity;
      if (payload.isUnlimitedValidity) {
        updateData["subscription_valid_until"] = null;
      }
    }

    if (payload.subscriptionValidUntil !== undefined && !payload.isUnlimitedValidity) {
      updateData["subscription_valid_until"] = payload.subscriptionValidUntil;
    }

    const { data: updated, error } = await adminClient
      .from("tenants")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      return reply.status(500).send({
        error: { code: "UPDATE_TENANT_FAILED", message: error.message },
      });
    }

    if (!updated) {
      return reply.status(404).send({
        error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" },
      });
    }

    return reply.send({ data: updated, message: "Company details updated successfully" });
  });

  // --------------------------------------------------------------------------
  // 5. RESET TENANT ADMIN PASSWORD
  // --------------------------------------------------------------------------
  fastify.post("/tenants/:id/reset-admin-password", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const parseResult = resetPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid password data" },
      });
    }

    const { userId, newPassword } = parseResult.data;

    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return reply.status(500).send({
        error: { code: "PASSWORD_RESET_FAILED", message: error.message },
      });
    }

    return reply.send({
      message: `Password for admin user (${data.user.email}) successfully updated!`,
    });
  });

  // --------------------------------------------------------------------------
  // 6. UPLOAD TELEMATICS COMPANY DOCUMENT (CR, LICENSE, CONTRACT, LOGO)
  // --------------------------------------------------------------------------
  fastify.post("/tenants/:id/documents", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { id: tenantId } = request.params as { id: string };
    const parseResult = uploadDocumentSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid document data", details: parseResult.error.flatten() },
      });
    }

    const p = parseResult.data;
    const uploaderId = request.auth?.user.id ?? null;

    const { data: doc, error } = await adminClient
      .from("tenant_documents")
      .insert({
        tenant_id: tenantId,
        document_type: p.documentType,
        title: p.title,
        file_name: p.fileName,
        file_size_bytes: p.fileSizeBytes ?? null,
        mime_type: p.mimeType ?? "application/pdf",
        file_data: p.fileData,
        uploaded_by: uploaderId,
        notes: p.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return reply.status(500).send({
        error: { code: "DOCUMENT_UPLOAD_FAILED", message: error.message },
      });
    }

    return reply.status(201).send({
      data: doc,
      message: `Document "${doc.title}" successfully uploaded and linked to company!`,
    });
  });

  // --------------------------------------------------------------------------
  // 7. DELETE TELEMATICS COMPANY DOCUMENT
  // --------------------------------------------------------------------------
  fastify.delete("/tenants/:id/documents/:docId", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { id: tenantId, docId } = request.params as { id: string; docId: string };

    const { error } = await adminClient
      .from("tenant_documents")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", docId);

    if (error) {
      return reply.status(500).send({
        error: { code: "DELETE_DOCUMENT_FAILED", message: error.message },
      });
    }

    return reply.send({ message: "Document deleted successfully" });
  });

  // --------------------------------------------------------------------------
  // 8. GLOBAL PLATFORM BACKUP SUMMARY (METRICS)
  // --------------------------------------------------------------------------
  fastify.get("/backup/summary", async (_request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const [
      tenantsRes,
      customersRes,
      assetsRes,
      ticketsRes,
      workOrdersRes,
      techsRes,
      docsRes,
      evidenceRes,
      invoicesRes,
    ] = await Promise.all([
      adminClient.from("tenants").select("id", { count: "exact", head: true }),
      adminClient.from("customer_accounts").select("id", { count: "exact", head: true }),
      adminClient.from("assets").select("id", { count: "exact", head: true }),
      adminClient.from("tickets").select("id", { count: "exact", head: true }),
      adminClient.from("work_orders").select("id", { count: "exact", head: true }),
      adminClient.from("technicians").select("id", { count: "exact", head: true }),
      adminClient.from("tenant_documents").select("id", { count: "exact", head: true }),
      adminClient.from("service_evidence").select("id", { count: "exact", head: true }),
      adminClient.from("invoices").select("id", { count: "exact", head: true }),
    ]);

    return reply.send({
      data: {
        totalTenants: tenantsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalAssets: assetsRes.count || 0,
        totalTickets: ticketsRes.count || 0,
        totalWorkOrders: workOrdersRes.count || 0,
        totalTechnicians: techsRes.count || 0,
        totalDocuments: docsRes.count || 0,
        totalEvidence: evidenceRes.count || 0,
        totalInvoices: invoicesRes.count || 0,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // --------------------------------------------------------------------------
  // 9. COMPLETE GLOBAL PLATFORM BACKUP EXPORT (ALL DATA & FILES)
  // --------------------------------------------------------------------------
  fastify.get("/backup", async (_request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const tablesToBackup = [
      "tenants",
      "tenant_settings",
      "tenant_documents",
      "departments",
      "roles",
      "permissions",
      "role_permissions",
      "profiles",
      "tenant_memberships",
      "membership_roles",
      "customer_accounts",
      "customer_sites",
      "customer_contacts",
      "customer_users",
      "asset_categories",
      "assets",
      "asset_telematics_devices",
      "ticket_categories",
      "tickets",
      "ticket_activities",
      "ticket_comments",
      "technicians",
      "technician_skills",
      "work_orders",
      "work_order_tasks",
      "service_visits",
      "service_evidence",
      "inventory_items",
      "inventory_levels",
      "maintenance_schedules",
      "rma_requests",
      "contracts",
      "slas",
      "quotations",
      "invoices",
      "payments",
      "knowledge_articles",
    ];

    const backupData: Record<string, any[]> = {};
    const summary: Record<string, number> = {};

    const results = await Promise.all(
      tablesToBackup.map(async (tbl) => {
        try {
          const { data, error } = await adminClient.from(tbl).select("*");
          if (!error && Array.isArray(data)) {
            return { tbl, data, count: data.length };
          }
          return { tbl, data: [], count: 0 };
        } catch {
          return { tbl, data: [], count: 0 };
        }
      })
    );

    for (const r of results) {
      backupData[r.tbl] = r.data;
      summary[r.tbl] = r.count;
    }

    const payload = {
      backupVersion: "1.0",
      system: "CareOS SaaS Control Plane",
      exportedAt: new Date().toISOString(),
      summary,
      tables: backupData,
    };

    const fileName = `careos-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
    reply.header("Content-Type", "application/json");

    return reply.send(payload);
  });

  // --------------------------------------------------------------------------
  // 10. RESTORE GLOBAL PLATFORM SNAPSHOT
  // --------------------------------------------------------------------------
  fastify.post("/restore", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const body = request.body as any;
    if (!body || !body.tables || typeof body.tables !== "object") {
      return reply.status(400).send({
        error: { code: "INVALID_BACKUP_FORMAT", message: "Invalid backup file structure. Missing 'tables' object." },
      });
    }

    // Restore tables in topological dependency order
    const orderedTables = [
      "tenants",
      "tenant_settings",
      "tenant_documents",
      "departments",
      "roles",
      "permissions",
      "role_permissions",
      "profiles",
      "tenant_memberships",
      "membership_roles",
      "customer_accounts",
      "customer_sites",
      "customer_contacts",
      "customer_users",
      "asset_categories",
      "assets",
      "asset_telematics_devices",
      "ticket_categories",
      "tickets",
      "ticket_activities",
      "ticket_comments",
      "technicians",
      "technician_skills",
      "work_orders",
      "work_order_tasks",
      "service_visits",
      "service_evidence",
      "inventory_items",
      "inventory_levels",
      "maintenance_schedules",
      "rma_requests",
      "contracts",
      "slas",
      "quotations",
      "invoices",
      "payments",
      "knowledge_articles",
    ];

    const restoredCounts: Record<string, number> = {};

    for (const tbl of orderedTables) {
      const rows = body.tables[tbl];
      if (Array.isArray(rows) && rows.length > 0) {
        try {
          const { error } = await adminClient
            .from(tbl)
            .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

          if (!error) {
            restoredCounts[tbl] = rows.length;
          } else {
            fastify.log.warn({ table: tbl, err: error.message }, "Restore warning on table");
            restoredCounts[tbl] = 0;
          }
        } catch (e: any) {
          fastify.log.warn({ table: tbl, err: e.message }, "Restore exception on table");
          restoredCounts[tbl] = 0;
        }
      }
    }

    return reply.send({
      message: "CareOS platform data successfully restored!",
      restoredSummary: restoredCounts,
      restoredAt: new Date().toISOString(),
    });
  });
};
