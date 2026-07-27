BEGIN;

CREATE TABLE IF NOT EXISTS public.site_settings (
    id VARCHAR(32) PRIMARY KEY,
    brand_description TEXT,
    website_url VARCHAR(1000),
    instagram_url VARCHAR(1000),
    youtube_url VARCHAR(1000),
    vimeo_url VARCHAR(1000),
    support_email VARCHAR(320),
    privacy_email VARCHAR(320),
    contact_phone VARCHAR(80),
    address TEXT,
    privacy_policy TEXT,
    terms_conditions TEXT,
    effective_date VARCHAR(80),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.portfolio_items
    ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.portfolio_items
    ALTER COLUMN image TYPE TEXT;

-- Earlier administrator-created portfolio rows were private only because the
-- old UI/backend had no reliable publish path. Publish those existing admin
-- rows so they immediately appear on the landing page after this migration.
UPDATE public.portfolio_items AS portfolio
SET published = TRUE
FROM public.users AS owner
WHERE portfolio.user_id = owner.id
  AND UPPER(CAST(owner.role AS TEXT)) = 'ADMIN'
  AND portfolio.published = FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_published_created
    ON public.portfolio_items (created_at DESC)
    WHERE published;

INSERT INTO public.site_settings (
    id, brand_description, website_url, instagram_url, youtube_url, vimeo_url,
    support_email, privacy_email, contact_phone, address, effective_date
) VALUES (
    'public',
    'Redefining cinematic boundaries through tech-driven artistry and luxury visual storytelling since 2018.',
    'https://valkyrias.co',
    'https://instagram.com/',
    'https://youtube.com/',
    'https://vimeo.com/',
    'valkyriasproclub@gmail.com',
    'cooperdesignss@gmail.com',
    '+91 00000 00000',
    'Vanasangari Amman Kovil Street, Ramanathapuram, Tamil Nadu – 623501, India',
    '27 July 2026'
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_settings FROM anon, authenticated;

COMMIT;
