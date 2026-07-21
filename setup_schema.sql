-- ==========================================
-- Supabase SQL Schema Setup & Security Policies
-- Run this script in your Supabase SQL Editor
-- to create all required tables and configure RLS.
-- ==========================================

-- 1. Create App Settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_contract NUMERIC NOT NULL DEFAULT 1240000,
    paid_to_date NUMERIC NOT NULL DEFAULT 790000,
    next_invoice NUMERIC NOT NULL DEFAULT 450000,
    active_plan TEXT,
    storage_used NUMERIC NOT NULL DEFAULT 1.2,
    storage_total NUMERIC NOT NULL DEFAULT 2.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    client TEXT,
    editor TEXT,
    budget NUMERIC DEFAULT 0,
    progress NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active',
    version TEXT DEFAULT 'v1.0',
    deadline TEXT,
    storage TEXT,
    category TEXT,
    thumbnail TEXT,
    contributors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Action Items table
CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'feedback',
    budget NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    sender_name TEXT,
    message TEXT NOT NULL,
    time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    time TEXT,
    size TEXT,
    thumbnail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Portfolio Items table
CREATE TABLE IF NOT EXISTS portfolio_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    image TEXT,
    description TEXT,
    software TEXT,
    client_name TEXT,
    duration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Plans table
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price TEXT,
    period TEXT,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT DEFAULT 'General',
    is_ai_summarized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Enable Row Level Security (RLS) on all tables
-- ==========================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Corrected Row Level Security Policies
-- (Notice: FOR ALL requires 'FOR ALL' syntax)
-- ==========================================

-- Policy for app_settings (Where ID is the User ID)
CREATE POLICY "user_settings_policy" ON app_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy for projects
CREATE POLICY "user_projects_policy" ON projects
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for action_items
CREATE POLICY "user_action_items_policy" ON action_items
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for chat_messages
CREATE POLICY "user_chat_messages_policy" ON chat_messages
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for deliverables
CREATE POLICY "user_deliverables_policy" ON deliverables
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for portfolio_items
CREATE POLICY "user_portfolio_items_policy" ON portfolio_items
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for plans
CREATE POLICY "user_plans_policy" ON plans
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for notes
CREATE POLICY "user_notes_policy" ON notes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
