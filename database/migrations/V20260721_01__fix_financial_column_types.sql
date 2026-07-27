-- Safe PostgreSQL/Supabase migration for monetary columns.
--
-- Usage:
--   1. Run the preflight SELECT in the Supabase SQL Editor and review the
--      current types, row counts, minimums, maximums, and incompatible_rows.
--   2. Run the complete file. The transaction aborts before any ALTER if a
--      value cannot be represented exactly as NUMERIC(19,2).
--
-- All five fields are monetary amounts. In particular, next_invoice is the
-- outstanding invoice amount used by checkout, not an invoice sequence.

-- Preflight: incompatible_rows must be zero for every populated column.
SELECT 'action_items.budget' AS column_name,
       pg_typeof(budget)::text AS current_type,
       count(*) AS row_count,
       min(budget::numeric) AS minimum_value,
       max(budget::numeric) AS maximum_value,
       count(*) FILTER (
           WHERE budget IS NOT NULL
             AND (abs(budget::numeric) >= 100000000000000000::numeric
                  OR budget::numeric <> round(budget::numeric, 2))
       ) AS incompatible_rows
FROM public.action_items
GROUP BY pg_typeof(budget)
UNION ALL
SELECT 'projects.budget', pg_typeof(budget)::text, count(*),
       min(budget::numeric), max(budget::numeric),
       count(*) FILTER (
           WHERE budget IS NOT NULL
             AND (abs(budget::numeric) >= 100000000000000000::numeric
                  OR budget::numeric <> round(budget::numeric, 2))
       )
FROM public.projects
GROUP BY pg_typeof(budget)
UNION ALL
SELECT 'app_settings.total_contract', pg_typeof(total_contract)::text, count(*),
       min(total_contract::numeric), max(total_contract::numeric),
       count(*) FILTER (
           WHERE total_contract IS NOT NULL
             AND (abs(total_contract::numeric) >= 100000000000000000::numeric
                  OR total_contract::numeric <> round(total_contract::numeric, 2))
       )
FROM public.app_settings
GROUP BY pg_typeof(total_contract)
UNION ALL
SELECT 'app_settings.paid_to_date', pg_typeof(paid_to_date)::text, count(*),
       min(paid_to_date::numeric), max(paid_to_date::numeric),
       count(*) FILTER (
           WHERE paid_to_date IS NOT NULL
             AND (abs(paid_to_date::numeric) >= 100000000000000000::numeric
                  OR paid_to_date::numeric <> round(paid_to_date::numeric, 2))
       )
FROM public.app_settings
GROUP BY pg_typeof(paid_to_date)
UNION ALL
SELECT 'app_settings.next_invoice', pg_typeof(next_invoice)::text, count(*),
       min(next_invoice::numeric), max(next_invoice::numeric),
       count(*) FILTER (
           WHERE next_invoice IS NOT NULL
             AND (abs(next_invoice::numeric) >= 100000000000000000::numeric
                  OR next_invoice::numeric <> round(next_invoice::numeric, 2))
       )
FROM public.app_settings
GROUP BY pg_typeof(next_invoice);

BEGIN;

DO $migration$
DECLARE
    target record;
    incompatible_count bigint;
    current_data_type text;
    current_precision integer;
    current_scale integer;
BEGIN
    FOR target IN
        SELECT *
        FROM (VALUES
            ('action_items', 'budget'),
            ('projects', 'budget'),
            ('app_settings', 'total_contract'),
            ('app_settings', 'paid_to_date'),
            ('app_settings', 'next_invoice')
        ) AS monetary_column(table_name, column_name)
    LOOP
        IF to_regclass(format('public.%I', target.table_name)) IS NULL THEN
            RAISE EXCEPTION 'Required table public.% does not exist', target.table_name;
        END IF;

        SELECT columns.data_type, columns.numeric_precision, columns.numeric_scale
          INTO current_data_type, current_precision, current_scale
          FROM information_schema.columns
         WHERE columns.table_schema = 'public'
           AND columns.table_name = target.table_name
           AND columns.column_name = target.column_name;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Required column public.%.% does not exist',
                target.table_name, target.column_name;
        END IF;

        EXECUTE format(
            'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND '
            || '(abs(%I::numeric) >= 100000000000000000::numeric '
            || 'OR %I::numeric <> round(%I::numeric, 2))',
            target.table_name,
            target.column_name,
            target.column_name,
            target.column_name,
            target.column_name
        ) INTO incompatible_count;

        IF incompatible_count > 0 THEN
            RAISE EXCEPTION
                'public.%.% contains % value(s) that cannot be represented exactly as NUMERIC(19,2)',
                target.table_name, target.column_name, incompatible_count;
        END IF;

        IF current_data_type <> 'numeric'
           OR current_precision IS DISTINCT FROM 19
           OR current_scale IS DISTINCT FROM 2 THEN
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN %I TYPE NUMERIC(19,2) USING %I::numeric(19,2)',
                target.table_name,
                target.column_name,
                target.column_name
            );
        END IF;
    END LOOP;
END
$migration$;

COMMIT;

-- Post-migration verification: every row should report numeric, 19, 2.
SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
      ('action_items', 'budget'),
      ('projects', 'budget'),
      ('app_settings', 'total_contract'),
      ('app_settings', 'paid_to_date'),
      ('app_settings', 'next_invoice')
  )
ORDER BY table_name, column_name;
