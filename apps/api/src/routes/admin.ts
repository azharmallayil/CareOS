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
  status: z.enum(["active", "suspended", "archived"]).default("active"),
  adminFullName: z.string().min(2).max(100).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
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
  // 1. LIST TENANTS
  // --------------------------------------------------------------------------
  fastify.get("/tenants", async (request, reply) => {
    if (!adminClient) {
      return reply.status(503).send({
        error: { code: "SERVICE_UNAVAILABLE", message: "Database client unavailable" },
      });
    }

    const { data: tenants, error } = await adminClient
      .from("tenants")
      .select("id, slug, name, plan, status, created_at, updated_at")
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
  // 2. CREATE / PROVISION NEW TELEMATICS COMPANY (TENANT)
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

    // 1. Insert tenant (database trigger automatically bootstraps settings, department, roles & permissions)
    const { data: newTenant, error: insertError } = await adminClient
      .from("tenants")
      .insert({
        name: payload.name,
        slug: payload.slug,
        plan: payload.plan,
        status: payload.status,
      })
      .select("id, slug, name, plan, status, created_at")
      .single();

    if (insertError || !newTenant) {
      fastify.log.error(insertError, "Failed to create new tenant");
      return reply.status(500).send({
        error: { code: "TENANT_CREATION_FAILED", message: insertError?.message || "Failed to create tenant" },
      });
    }

    let provisionedAdmin: { userId: string; email: string; fullName: string } | null = null;

    // 2. Provision Initial Tenant Admin User if email provided
    if (payload.adminEmail) {
      const email = payload.adminEmail.toLowerCase().trim();
      const fullName = payload.adminFullName || `${payload.name} Admin`;
      const password = payload.adminPassword || "CareOS@2026!";

      try {
        let userId: string;

        // Create auth user or fetch existing
        const { data: createUserRes, error: createAuthError } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });

        if (createAuthError) {
          // If already registered, fetch user by email
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

        // Fetch tenant_admin role ID created by bootstrap trigger
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
  // 3. UPDATE TENANT
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

    const { data: updated, error } = await adminClient
      .from("tenants")
      .update(parseResult.data)
      .eq("id", id)
      .select("id, slug, name, plan, status, updated_at")
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

    return reply.send({ data: updated });
  });
};
