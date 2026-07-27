CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT coupons_code_format CHECK (code ~ '^[A-Z0-9_-]{4,32}$'),
    CONSTRAINT coupons_discount_range CHECK (discount_percent > 0 AND discount_percent < 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_code_upper ON public.coupons (UPPER(code));

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS order_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(32);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM anon, authenticated;
