-- Migration: 20261116000019_tenant_official_details_and_documents.sql
-- Description: Extends tenants table with official company details, CR, VAT, subscription validity & adds tenant_documents table.

-- 1. Extend tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS commercial_register TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Saudi Arabia',
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Riyadh',
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS subscription_valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_unlimited_validity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create tenant_documents table for storing official company certificates, agreements & logos
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('commercial_registration', 'telematics_license', 'tax_certificate', 'sla_contract', 'brand_logo', 'other')),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  file_data TEXT NOT NULL, -- Stored securely (Base64 data URI or signed URL)
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant_id 
  ON public.tenant_documents (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_type 
  ON public.tenant_documents (tenant_id, document_type);

-- 3. RLS Security on tenant_documents
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_documents_select" ON public.tenant_documents
  FOR SELECT
  USING (
    app_private.is_platform_admin() OR
    app_private.has_active_membership(tenant_id)
  );

CREATE POLICY "tenant_documents_insert" ON public.tenant_documents
  FOR INSERT
  WITH CHECK (
    app_private.is_platform_admin() OR
    app_private.is_tenant_admin(tenant_id)
  );

CREATE POLICY "tenant_documents_update" ON public.tenant_documents
  FOR UPDATE
  USING (
    app_private.is_platform_admin() OR
    app_private.is_tenant_admin(tenant_id)
  );

CREATE POLICY "tenant_documents_delete" ON public.tenant_documents
  FOR DELETE
  USING (
    app_private.is_platform_admin() OR
    app_private.is_tenant_admin(tenant_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_documents TO authenticated;
