import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * PostgreSQL-only checks for the dynamic-domain migration and its transaction
 * runner. This source directory is compiled only by the migration-it profile.
 */
@Testcontainers(disabledWithoutDocker = true)
final class DynamicDomainMigrationPostgresTest {
    private static final Path DYNAMIC_MIGRATION = Path.of(
                    "database", "migrations", "V20260722_01__create_dynamic_application_domain.sql")
            .toAbsolutePath()
            .normalize();

    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("valkyrias_migration_it")
            .withUsername("valkyrias_migration_it")
            .withPassword("disposable-test-password");

    @BeforeEach
    void createDisposableSupabaseFixture() throws Exception {
        assertTrue(Files.isRegularFile(DYNAMIC_MIGRATION),
                () -> "Migration file not found: " + DYNAMIC_MIGRATION);

        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute("DROP PUBLICATION IF EXISTS supabase_realtime");
            statement.execute("DROP SCHEMA IF EXISTS auth CASCADE");
            statement.execute("DROP SCHEMA IF EXISTS public CASCADE");
            statement.execute("CREATE SCHEMA public");
            statement.execute("CREATE SCHEMA auth");
            statement.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                            CREATE ROLE anon NOLOGIN;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                            CREATE ROLE authenticated NOLOGIN;
                        END IF;
                    END
                    $$
                    """);
            statement.execute("""
                    CREATE FUNCTION auth.uid()
                    RETURNS UUID
                    LANGUAGE sql
                    STABLE
                    AS $$ SELECT NULL::UUID $$
                    """);
            statement.execute("""
                    CREATE TABLE public.users (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        supabase_user_id UUID,
                        role VARCHAR(30) NOT NULL DEFAULT 'CLIENT'
                    )
                    """);
            statement.execute("""
                    CREATE TABLE public.portfolio_items (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """);
            statement.execute("CREATE PUBLICATION supabase_realtime");
        }
    }

    @Test
    void preservesLegacyMessagesAndCreatesNormalizedConversationMessages() throws Exception {
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE public.messages (
                        id UUID PRIMARY KEY,
                        thread_id UUID NOT NULL,
                        author_id UUID NOT NULL,
                        body TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """);
            statement.execute("""
                    INSERT INTO public.messages (id, thread_id, author_id, body)
                    VALUES (
                        '11111111-1111-1111-1111-111111111111',
                        '11111111-1111-1111-1111-111111111112',
                        '11111111-1111-1111-1111-111111111113',
                        'legacy message payload'
                    )
                    """);

            runActualMigration(connection);

            assertEquals("legacy message payload", scalarString(connection,
                    "SELECT body FROM public.messages WHERE id = "
                            + "'11111111-1111-1111-1111-111111111111'"));
            assertFalse(columnExists(connection, "public", "messages", "conversation_id"));
            assertTrue(tableExists(connection, "public", "conversation_messages"));
            assertTrue(columnExists(connection, "public", "conversation_messages", "conversation_id"));
        }
    }

    @Test
    void completesACompatiblePartialDynamicSchema() throws Exception {
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE public.services (
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
                        CONSTRAINT services_name_not_blank
                            CHECK (CHAR_LENGTH(BTRIM(name)) BETWEEN 2 AND 120),
                        CONSTRAINT services_base_price_nonnegative CHECK (base_price >= 0),
                        CONSTRAINT services_currency_format CHECK (currency ~ '^[A-Z]{3}$')
                    )
                    """);
            statement.execute("""
                    INSERT INTO public.services (id, name, category)
                    VALUES ('22222222-2222-2222-2222-222222222222', 'Existing Service', 'LEGACY')
                    """);

            runActualMigration(connection);

            assertEquals("Existing Service", scalarString(connection,
                    "SELECT name FROM public.services WHERE id = "
                            + "'22222222-2222-2222-2222-222222222222'"));
            assertTrue(tableExists(connection, "public", "orders"));
            assertTrue(tableExists(connection, "public", "conversation_messages"));
            assertTrue(tableExists(connection, "public", "notifications"));
        }
    }

    @Test
    void actualMigrationIsIdempotent() throws Exception {
        try (Connection connection = openConnection()) {
            ByteArrayOutputStream firstOutput = runActualMigration(connection);
            ByteArrayOutputStream secondOutput = runActualMigration(connection);

            String fileName = DYNAMIC_MIGRATION.getFileName().toString();
            assertTrue(firstOutput.toString(StandardCharsets.UTF_8).contains("Applied " + fileName));
            assertTrue(secondOutput.toString(StandardCharsets.UTF_8).contains("Applied " + fileName));
            assertEquals(1, scalarInt(connection,
                    "SELECT COUNT(*) FROM information_schema.tables "
                            + "WHERE table_schema='public' AND table_name='conversation_messages'"));
        }
    }

    @Test
    void failedMigrationRollsBackWithoutAppliedOutputOrSuccessHistory() throws Exception {
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE public.migration_success_history (
                        migration_name TEXT PRIMARY KEY,
                        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """);

            String deliberatelyBrokenSql = """
                    CREATE TABLE public.rollback_probe (id INTEGER PRIMARY KEY);
                    INSERT INTO public.rollback_probe (id) VALUES (1);
                    INSERT INTO public.migration_success_history (migration_name)
                        VALUES ('V99999999_99__deliberate_failure.sql');
                    SELECT 1 / 0;
                    """;
            ApplySqlMigrations.MigrationPlan plan = ApplySqlMigrations.prepareMigration(
                    Path.of("V99999999_99__deliberate_failure.sql"), deliberatelyBrokenSql);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();

            try (PrintStream output = new PrintStream(bytes, true, StandardCharsets.UTF_8)) {
                ApplySqlMigrations.MigrationDiagnostic failure = assertThrows(
                        ApplySqlMigrations.MigrationDiagnostic.class,
                        () -> ApplySqlMigrations.executeMigration(connection, plan, output));
                assertTrue(failure.getMessage().contains("SQLState=22012"));
            }

            assertFalse(bytes.toString(StandardCharsets.UTF_8).contains("Applied "));
            assertFalse(tableExists(connection, "public", "rollback_probe"));
            assertEquals(0, scalarInt(connection,
                    "SELECT COUNT(*) FROM public.migration_success_history"));
        }
    }

    private static ByteArrayOutputStream runActualMigration(Connection connection) throws Exception {
        ApplySqlMigrations.MigrationPlan plan = ApplySqlMigrations.prepareMigration(DYNAMIC_MIGRATION);
        ApplySqlMigrations.validateExistingTableCompatibility(connection, plan);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (PrintStream output = new PrintStream(bytes, true, StandardCharsets.UTF_8)) {
            ApplySqlMigrations.executeMigration(connection, plan, output);
        }
        return bytes;
    }

    private static Connection openConnection() throws SQLException {
        Properties properties = new Properties();
        properties.setProperty("user", POSTGRES.getUsername());
        properties.setProperty("password", POSTGRES.getPassword());
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), properties);
    }

    private static boolean tableExists(
            Connection connection, String schema, String table) throws SQLException {
        try (ResultSet rows = connection.getMetaData().getTables(
                connection.getCatalog(), schema, table, new String[] {"TABLE"})) {
            return rows.next();
        }
    }

    private static boolean columnExists(
            Connection connection, String schema, String table, String column) throws SQLException {
        try (ResultSet rows = connection.getMetaData().getColumns(
                connection.getCatalog(), schema, table, column)) {
            return rows.next();
        }
    }

    private static String scalarString(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getString(1);
        }
    }

    private static int scalarInt(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet rows = statement.executeQuery(sql)) {
            assertTrue(rows.next());
            return rows.getInt(1);
        }
    }
}
