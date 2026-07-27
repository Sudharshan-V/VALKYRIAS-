-- Role values are persisted as the UserRole enum names. This keeps existing
-- lowercase rows compatible with @Enumerated(EnumType.STRING) and rejects
-- future unsupported values at the database boundary.
UPDATE users
SET role = UPPER(TRIM(role))
WHERE role IS NOT NULL;

-- Supabase is the only credential provider. Remove legacy local password
-- material after the application no longer maps the password column.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        UPDATE users SET password = NULL;
    END IF;
END $$;

ALTER TABLE users
    ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_allowed_values'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_role_allowed_values
            CHECK (role IN ('ADMIN', 'EDITOR', 'CLIENT'));
    END IF;
END $$;
