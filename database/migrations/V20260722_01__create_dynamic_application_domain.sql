-- Additive, non-destructive application-domain schema.
--
-- This migration intentionally does not copy legacy dashboard rows. The old
-- projects/chat_messages/deliverables tables do not carry enough relational
-- identity to infer safe order ownership or conversation participation.
-- public.messages and public.chat_messages are legacy relations and are left
-- unchanged. Normalized order conversations use public.conversation_messages.

BEGIN;

-- Fail before the first schema mutation if a required base relation is absent
-- or an existing dynamic relation is not compatible with this migration.
-- Missing dynamic relations are expected on a clean/current legacy database;
-- CREATE TABLE below will create them. In particular, public.messages is not
-- part of this preflight because it belongs to the legacy application model.
DO $migration_preflight$
DECLARE
    expected_relation RECORD;
    relation_oid OID;
    relation_kind "char";
    missing_columns TEXT;
BEGIN
    FOR expected_relation IN
        SELECT expected.table_name, expected.required_columns
        FROM (VALUES
            ('users', ARRAY[
                'id', 'supabase_user_id', 'role'
            ]::TEXT[]),
            ('portfolio_items', ARRAY[
                'created_at'
            ]::TEXT[]),
            ('services', ARRAY[
                'id', 'name', 'description', 'category', 'base_price', 'currency',
                'delivery_estimate', 'required_client_information', 'active',
                'created_by', 'created_at', 'updated_at'
            ]::TEXT[]),
            ('service_packages', ARRAY[
                'id', 'service_id', 'name', 'description', 'price', 'currency',
                'delivery_days', 'features', 'active', 'display_order',
                'created_at', 'updated_at'
            ]::TEXT[]),
            ('orders', ARRAY[
                'id', 'client_id', 'assigned_editor_id', 'service_id',
                'service_package_id', 'title', 'requirements', 'status', 'budget',
                'currency', 'progress', 'deadline', 'submitted_at', 'completed_at',
                'created_at', 'updated_at', 'version'
            ]::TEXT[]),
            ('order_requirements', ARRAY[
                'id', 'order_id', 'requirement_key', 'requirement_value',
                'created_at', 'updated_at'
            ]::TEXT[]),
            ('order_assignments', ARRAY[
                'id', 'order_id', 'editor_id', 'assigned_by', 'status',
                'response_note', 'assigned_at', 'responded_at'
            ]::TEXT[]),
            ('conversations', ARRAY[
                'id', 'order_id', 'created_at', 'updated_at'
            ]::TEXT[]),
            ('conversation_participants', ARRAY[
                'conversation_id', 'user_id', 'joined_at', 'left_at'
            ]::TEXT[]),
            ('conversation_messages', ARRAY[
                'id', 'conversation_id', 'sender_id', 'content', 'message_type',
                'created_at', 'edited_at', 'deleted_at', 'client_request_id'
            ]::TEXT[]),
            ('message_reads', ARRAY[
                'message_id', 'user_id', 'read_at'
            ]::TEXT[]),
            ('file_records', ARRAY[
                'id', 'order_id', 'conversation_id', 'message_id', 'uploaded_by',
                'storage_bucket', 'storage_path', 'original_filename',
                'content_type', 'size_bytes', 'category', 'created_at', 'deleted_at'
            ]::TEXT[]),
            ('revision_requests', ARRAY[
                'id', 'order_id', 'requested_by', 'notes', 'status', 'created_at',
                'resolved_at'
            ]::TEXT[]),
            ('notifications', ARRAY[
                'id', 'user_id', 'type', 'title', 'body', 'related_entity_type',
                'related_entity_id', 'read_at', 'created_at'
            ]::TEXT[]),
            ('payments', ARRAY[
                'id', 'order_id', 'client_id', 'amount', 'currency', 'provider',
                'provider_order_id', 'provider_payment_id', 'status',
                'verification_result', 'created_at', 'paid_at'
            ]::TEXT[]),
            ('reviews', ARRAY[
                'id', 'order_id', 'client_id', 'editor_id', 'rating', 'comment',
                'created_at', 'updated_at'
            ]::TEXT[]),
            ('order_events', ARRAY[
                'id', 'order_id', 'actor_id', 'event_type', 'from_status',
                'to_status', 'details', 'created_at'
            ]::TEXT[])
        ) AS expected(table_name, required_columns)
    LOOP
        SELECT relation.oid, relation.relkind
        INTO relation_oid, relation_kind
        FROM pg_catalog.pg_class relation
        JOIN pg_catalog.pg_namespace namespace
          ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = expected_relation.table_name;

        IF NOT FOUND THEN
            IF expected_relation.table_name IN ('users', 'portfolio_items') THEN
                RAISE EXCEPTION 'Required base table public.% does not exist',
                    expected_relation.table_name
                    USING ERRCODE = '42P01';
            END IF;
            CONTINUE;
        END IF;

        IF relation_kind NOT IN ('r', 'p') THEN
            RAISE EXCEPTION 'public.% exists but is not a table',
                expected_relation.table_name
                USING ERRCODE = '42809';
        END IF;

        SELECT STRING_AGG(required.required_column, ', ' ORDER BY required.required_column)
        INTO missing_columns
        FROM UNNEST(expected_relation.required_columns) AS required(required_column)
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_attribute attribute
            WHERE attribute.attrelid = relation_oid
              AND attribute.attname = required.required_column
              AND attribute.attnum > 0
              AND NOT attribute.attisdropped
        );

        IF missing_columns IS NOT NULL THEN
            RAISE EXCEPTION 'Existing table public.% is incompatible; missing columns: %',
                expected_relation.table_name, missing_columns
                USING ERRCODE = '55000',
                      HINT = 'Review the existing table; this migration will not drop, rename, or reinterpret legacy data.';
        END IF;
    END LOOP;

    IF to_regclass('public.conversation_messages') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint constraint_record
            JOIN pg_catalog.pg_attribute id_column
              ON id_column.attrelid = constraint_record.conrelid
             AND id_column.attnum = constraint_record.conkey[1]
            WHERE constraint_record.contype = 'p'
              AND constraint_record.conrelid = to_regclass('public.conversation_messages')
              AND CARDINALITY(constraint_record.conkey) = 1
              AND id_column.attname = 'id'
       ) THEN
        RAISE EXCEPTION 'Existing public.conversation_messages must have id as its primary key'
            USING ERRCODE = '55000',
                  HINT = 'Review the partial schema; this migration will not replace an existing table or primary key.';
    END IF;

    -- A compatible partial/current schema must already point message_id at the
    -- normalized table. Never rewrite a legacy-message foreign key implicitly.
    IF to_regclass('public.message_reads') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint constraint_record
            JOIN pg_catalog.pg_attribute local_column
              ON local_column.attrelid = constraint_record.conrelid
             AND local_column.attnum = ANY (constraint_record.conkey)
            JOIN pg_catalog.pg_attribute referenced_column
              ON referenced_column.attrelid = constraint_record.confrelid
             AND referenced_column.attnum = ANY (constraint_record.confkey)
            WHERE constraint_record.contype = 'f'
              AND constraint_record.conrelid = to_regclass('public.message_reads')
              AND constraint_record.confrelid = to_regclass('public.conversation_messages')
              AND local_column.attname = 'message_id'
              AND referenced_column.attname = 'id'
       ) THEN
        RAISE EXCEPTION 'Existing public.message_reads.message_id does not reference public.conversation_messages(id)'
            USING ERRCODE = '55000',
                  HINT = 'Review the partial schema; this migration will not retarget existing data implicitly.';
    END IF;

    IF to_regclass('public.file_records') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint constraint_record
            JOIN pg_catalog.pg_attribute local_column
              ON local_column.attrelid = constraint_record.conrelid
             AND local_column.attnum = ANY (constraint_record.conkey)
            JOIN pg_catalog.pg_attribute referenced_column
              ON referenced_column.attrelid = constraint_record.confrelid
             AND referenced_column.attnum = ANY (constraint_record.confkey)
            WHERE constraint_record.contype = 'f'
              AND constraint_record.conrelid = to_regclass('public.file_records')
              AND constraint_record.confrelid = to_regclass('public.conversation_messages')
              AND local_column.attname = 'message_id'
              AND referenced_column.attname = 'id'
       ) THEN
        RAISE EXCEPTION 'Existing public.file_records.message_id does not reference public.conversation_messages(id)'
            USING ERRCODE = '55000',
                  HINT = 'Review the partial schema; this migration will not retarget existing data implicitly.';
    END IF;
END
$migration_preflight$;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE public.portfolio_items
    ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_published_created
    ON public.portfolio_items (created_at DESC)
    WHERE published;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint
        WHERE conname = 'users_account_status_allowed_values'
          AND conrelid = to_regclass('public.users')
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_account_status_allowed_values
            CHECK (account_status IN ('ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description VARCHAR(3000),
    category VARCHAR(100) NOT NULL,
    base_price NUMERIC(19, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    delivery_estimate VARCHAR(100),
    required_client_information JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT services_name_not_blank CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 2 AND 120),
    CONSTRAINT services_base_price_nonnegative CHECK (base_price >= 0),
    CONSTRAINT services_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_name_normalized
    ON public.services (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_services_active_category
    ON public.services (active, category);

CREATE TABLE IF NOT EXISTS public.service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(3000),
    price NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    delivery_days INTEGER,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_packages_price_nonnegative CHECK (price >= 0),
    CONSTRAINT service_packages_delivery_days_positive CHECK (delivery_days IS NULL OR delivery_days > 0),
    CONSTRAINT service_packages_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_packages_service_name
    ON public.service_packages (service_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_service_packages_active
    ON public.service_packages (service_id, active, display_order);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    assigned_editor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    requirements TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
    budget NUMERIC(19, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    progress INTEGER NOT NULL DEFAULT 0,
    deadline TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT orders_title_not_blank CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 2 AND 200),
    CONSTRAINT orders_status_allowed CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'EDITOR_ASSIGNED', 'ACCEPTED',
        'IN_PROGRESS', 'PREVIEW_READY', 'REVISION_REQUESTED', 'APPROVED',
        'PAYMENT_PENDING', 'PAID', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED'
    )),
    CONSTRAINT orders_budget_nonnegative CHECK (budget IS NULL OR budget >= 0),
    CONSTRAINT orders_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT orders_progress_range CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_orders_client_status ON public.orders (client_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_editor_status ON public.orders (assigned_editor_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    requirement_key VARCHAR(120) NOT NULL,
    requirement_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT order_requirements_key_not_blank CHECK (CHAR_LENGTH(BTRIM(requirement_key)) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_requirements_key
    ON public.order_requirements (order_id, LOWER(requirement_key));

CREATE TABLE IF NOT EXISTS public.order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    editor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    response_note VARCHAR(1000),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT order_assignments_status_allowed CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_order_assignments_editor_status
    ON public.order_assignments (editor_id, status, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_assignments_one_open
    ON public.order_assignments (order_id)
    WHERE status IN ('PENDING', 'ACCEPTED');

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
    ON public.conversation_participants (user_id, conversation_id);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    client_request_id UUID,
    CONSTRAINT conversation_messages_conversation_id_fkey
        FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
    CONSTRAINT conversation_messages_sender_id_fkey
        FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT conversation_messages_content_not_blank CHECK (CHAR_LENGTH(BTRIM(content)) BETWEEN 1 AND 10000),
    CONSTRAINT conversation_messages_type_allowed CHECK (message_type IN ('TEXT', 'FILE', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created
    ON public.conversation_messages (conversation_id, created_at DESC, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_sender_request
    ON public.conversation_messages (sender_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.message_reads (
    message_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT message_reads_conversation_message_id_fkey
        FOREIGN KEY (message_id) REFERENCES public.conversation_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads (user_id, read_at DESC);

CREATE TABLE IF NOT EXISTS public.file_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID,
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    storage_bucket VARCHAR(100) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(150) NOT NULL,
    size_bytes BIGINT NOT NULL,
    category VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT file_records_conversation_message_id_fkey
        FOREIGN KEY (message_id) REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
    CONSTRAINT file_records_path_not_blank CHECK (CHAR_LENGTH(BTRIM(storage_path)) BETWEEN 1 AND 1000),
    CONSTRAINT file_records_size_valid CHECK (size_bytes BETWEEN 1 AND 524288000),
    CONSTRAINT file_records_category_allowed CHECK (category IN (
        'CLIENT_ASSET', 'CHAT_ATTACHMENT', 'PREVIEW', 'DELIVERABLE', 'PORTFOLIO_MEDIA'
    ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_file_records_storage_object
    ON public.file_records (storage_bucket, storage_path)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_file_records_order_category
    ON public.file_records (order_id, category, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.revision_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    notes TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT revision_requests_notes_not_blank CHECK (CHAR_LENGTH(BTRIM(notes)) BETWEEN 1 AND 5000),
    CONSTRAINT revision_requests_status_allowed CHECK (status IN ('OPEN', 'RESOLVED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_revision_requests_order_status
    ON public.revision_requests (order_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(60) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    related_entity_type VARCHAR(60),
    related_entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    provider VARCHAR(50) NOT NULL,
    provider_order_id VARCHAR(255),
    provider_payment_id VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    verification_result VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT payments_status_allowed CHECK (status IN ('PENDING', 'REQUIRES_ACTION', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_payments_order_created ON public.payments (order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_payment
    ON public.payments (provider, provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    editor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL,
    comment VARCHAR(3000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_reviews_editor ON public.reviews (editor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type VARCHAR(80) NOT NULL,
    from_status VARCHAR(40),
    to_status VARCHAR(40),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_created
    ON public.order_events (order_id, created_at DESC);

-- Define the trigger function here so the migration does not depend on a
-- separately executed setup script.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    table_name TEXT;
    trigger_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['services', 'service_packages', 'orders', 'order_requirements', 'conversations', 'reviews']
    LOOP
        trigger_name := 'set_' || table_name || '_updated_at';
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = trigger_name
              AND tgrelid = ('public.' || table_name)::regclass
              AND NOT tgisinternal
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
                trigger_name,
                table_name
            );
        END IF;
    END LOOP;
END $$;

-- RLS helpers execute as the migration owner so policies can check normalized
-- relationships without recursively applying policies to the same tables.
-- They expose booleans/IDs only and never write application data.
CREATE OR REPLACE FUNCTION public.current_application_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.id
    FROM public.users u
    WHERE u.supabase_user_id = auth.uid()
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_application_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT u.role::TEXT
    FROM public.users u
    WHERE u.supabase_user_id = auth.uid()
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_order(target_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.users u ON u.supabase_user_id = auth.uid()
        WHERE o.id = target_order_id
          AND (u.role = 'ADMIN' OR u.id = o.client_id OR u.id = o.assigned_editor_id)
    )
$$;

CREATE OR REPLACE FUNCTION public.can_read_conversation(target_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        JOIN public.users u ON u.id = cp.user_id
        WHERE cp.conversation_id = target_conversation_id
          AND cp.left_at IS NULL
          AND u.supabase_user_id = auth.uid()
    )
$$;

REVOKE ALL ON FUNCTION public.current_application_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_application_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_order(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_application_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_application_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_conversation(UUID) TO authenticated;

-- Authenticated browsers receive SELECT only so Supabase Realtime can deliver
-- scoped changes. All application writes continue through Spring Boot.
GRANT SELECT ON public.services, public.service_packages TO anon, authenticated;
GRANT SELECT ON public.orders, public.order_requirements, public.order_assignments,
    public.conversations, public.conversation_participants, public.conversation_messages,
    public.message_reads, public.file_records, public.revision_requests,
    public.notifications, public.payments, public.reviews, public.order_events TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.services, public.service_packages, public.orders, public.order_requirements,
       public.order_assignments, public.conversations, public.conversation_participants,
       public.conversation_messages, public.message_reads, public.file_records, public.revision_requests,
       public.notifications, public.payments, public.reviews, public.order_events
    FROM anon, authenticated;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='public_active_services_read') THEN
        CREATE POLICY public_active_services_read ON public.services FOR SELECT TO anon, authenticated USING (active);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='service_packages' AND policyname='public_active_packages_read') THEN
        CREATE POLICY public_active_packages_read ON public.service_packages FOR SELECT TO anon, authenticated
            USING (active AND EXISTS (SELECT 1 FROM public.services s WHERE s.id=service_id AND s.active));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='participant_orders_read') THEN
        CREATE POLICY participant_orders_read ON public.orders FOR SELECT TO authenticated
            USING (public.can_read_order(id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_requirements' AND policyname='participant_requirements_read') THEN
        CREATE POLICY participant_requirements_read ON public.order_requirements FOR SELECT TO authenticated
            USING (public.can_read_order(order_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_assignments' AND policyname='participant_assignments_read') THEN
        CREATE POLICY participant_assignments_read ON public.order_assignments FOR SELECT TO authenticated USING (
            public.can_read_order(order_id) OR editor_id = public.current_application_user_id()
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='conversation_member_read') THEN
        CREATE POLICY conversation_member_read ON public.conversations FOR SELECT TO authenticated
            USING (public.can_read_conversation(id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_participants' AND policyname='conversation_participants_member_read') THEN
        CREATE POLICY conversation_participants_member_read ON public.conversation_participants FOR SELECT TO authenticated
            USING (public.can_read_conversation(conversation_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_messages' AND policyname='conversation_messages_member_read') THEN
        CREATE POLICY conversation_messages_member_read ON public.conversation_messages FOR SELECT TO authenticated
            USING (public.can_read_conversation(conversation_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='message_reads' AND policyname='own_message_reads') THEN
        CREATE POLICY own_message_reads ON public.message_reads FOR SELECT TO authenticated
            USING (user_id = public.current_application_user_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='file_records' AND policyname='participant_files_read') THEN
        CREATE POLICY participant_files_read ON public.file_records FOR SELECT TO authenticated USING (
            deleted_at IS NULL AND public.can_read_order(order_id)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='revision_requests' AND policyname='participant_revisions_read') THEN
        CREATE POLICY participant_revisions_read ON public.revision_requests FOR SELECT TO authenticated
            USING (public.can_read_order(order_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='own_notifications_read') THEN
        CREATE POLICY own_notifications_read ON public.notifications FOR SELECT TO authenticated
            USING (user_id = public.current_application_user_id());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='client_admin_payments_read') THEN
        CREATE POLICY client_admin_payments_read ON public.payments FOR SELECT TO authenticated USING (
            public.current_application_role() = 'ADMIN' OR client_id = public.current_application_user_id()
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='participant_reviews_read') THEN
        CREATE POLICY participant_reviews_read ON public.reviews FOR SELECT TO authenticated USING (
            public.current_application_role() = 'ADMIN'
            OR client_id = public.current_application_user_id()
            OR editor_id = public.current_application_user_id()
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_events' AND policyname='participant_order_events_read') THEN
        CREATE POLICY participant_order_events_read ON public.order_events FOR SELECT TO authenticated
            USING (public.can_read_order(order_id));
    END IF;
END $$;

-- Add the event-bearing tables to Supabase Realtime once. The block is safe
-- both when the publication is absent and when a table is already present.
DO $$
DECLARE
    realtime_table TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
        FOREACH realtime_table IN ARRAY ARRAY[
            'orders', 'order_assignments', 'conversation_messages', 'message_reads', 'file_records',
            'revision_requests', 'notifications', 'payments', 'order_events'
        ] LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=realtime_table
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
            END IF;
        END LOOP;
    END IF;
END $$;

COMMIT;

-- Verification: all rows should return non-null relation names.
SELECT unnest(ARRAY[
    to_regclass('public.services'), to_regclass('public.service_packages'),
    to_regclass('public.orders'), to_regclass('public.order_requirements'),
    to_regclass('public.order_assignments'),
    to_regclass('public.conversations'), to_regclass('public.conversation_participants'),
    to_regclass('public.conversation_messages'), to_regclass('public.message_reads'),
    to_regclass('public.file_records'), to_regclass('public.revision_requests'),
    to_regclass('public.notifications'), to_regclass('public.payments'),
    to_regclass('public.reviews'), to_regclass('public.order_events')
]) AS application_table;
