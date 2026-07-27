import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.lang.reflect.Proxy;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/** Standalone regression suite; requires only the Java 21 JDK. */
public final class ApplySqlMigrationsRegressionTest {
    private ApplySqlMigrationsRegressionTest() {}

    public static void main(String[] args) throws Exception {
        splitterUnderstandsPostgresLexicalForms();
        actualDynamicMigrationPassesOfflinePreflight();
        laterMigrationCanAlterTableDeclaredByEarlierMigration();
        staticPreflightRejectsMissingConversationId();
        catalogPreflightRejectsLegacyMessagesCollision();
        correctedConversationMessagesAndCompatibleRerunsPass();
        failedStatementRollsBackWithoutSuccessOutput();
        successfulMigrationCommitsBeforeSuccessOutput();
        System.out.println("ApplySqlMigrations regression tests: passed");
    }

    private static void actualDynamicMigrationPassesOfflinePreflight() throws Exception {
        Path migration = Path.of(
                "database", "migrations", "V20260722_01__create_dynamic_application_domain.sql")
                .toRealPath();
        var plan = ApplySqlMigrations.prepareMigration(migration);
        Path couponMigration = Path.of(
                "database", "migrations", "V20260726_01__add_security_deposit_gst_and_coupons.sql")
                .toRealPath();
        var couponPlan = ApplySqlMigrations.prepareMigration(
                couponMigration,
                java.nio.file.Files.readString(couponMigration),
                plan.declaredTables());

        assertFalse(plan.declaredTables().containsKey(
                new ApplySqlMigrations.QualifiedName("public", "messages")),
                "corrected migration still declares legacy public.messages");
        if (!plan.declaredTables().containsKey(
                new ApplySqlMigrations.QualifiedName("public", "conversation_messages"))) {
            throw new AssertionError("corrected migration does not declare public.conversation_messages");
        }
        if (!couponPlan.declaredTables().containsKey(
                new ApplySqlMigrations.QualifiedName("public", "coupons"))) {
            throw new AssertionError("coupon migration does not declare public.coupons");
        }
    }

    private static void laterMigrationCanAlterTableDeclaredByEarlierMigration() throws Exception {
        String firstSql = """
                CREATE TABLE IF NOT EXISTS public.payments (
                    id uuid PRIMARY KEY,
                    amount numeric(19,2) NOT NULL
                );
                """;
        String secondSql = """
                CREATE TABLE IF NOT EXISTS public.coupons (
                    id uuid PRIMARY KEY,
                    code varchar(32) NOT NULL
                );
                ALTER TABLE public.payments
                    ADD COLUMN IF NOT EXISTS coupon_code varchar(32);
                """;
        var first = ApplySqlMigrations.prepareMigration(Path.of("V_test__first.sql"), firstSql);
        var second = ApplySqlMigrations.prepareMigration(
                Path.of("V_test__second.sql"), secondSql, first.declaredTables());
        if (!second.declaredTables().containsKey(
                new ApplySqlMigrations.QualifiedName("public", "coupons"))) {
            throw new AssertionError("later migration did not retain its own declared table");
        }
    }

    private static void splitterUnderstandsPostgresLexicalForms() throws Exception {
        String sql = """
                -- semicolon ; in a line comment
                CREATE TABLE public.sample (id uuid, body text DEFAULT 'a;b');
                /* outer ; /* nested ; */ still outer */
                INSERT INTO public.sample VALUES ('00000000-0000-0000-0000-000000000000', E'c\\';d');
                DO $migration$
                BEGIN
                    PERFORM 'inside;dollar';
                END
                $migration$;
                SELECT \"semi;colon\" FROM public.sample;
                """;
        var statements = ApplySqlMigrations.splitPostgresStatements(sql);
        assertEquals(4, statements.size(), "split statement count");
        assertEquals("CREATE TABLE", statements.get(0).operation(), "first operation");
        assertEquals("DO", statements.get(2).operation(), "dollar-quoted DO operation");
    }

    private static void staticPreflightRejectsMissingConversationId() throws Exception {
        String broken = """
                CREATE TABLE IF NOT EXISTS public.messages (id uuid PRIMARY KEY);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation
                    ON public.messages (conversation_id);
                """;
        try {
            ApplySqlMigrations.prepareMigration(Path.of("V_test__broken.sql"), broken);
            throw new AssertionError("missing conversation_id should fail static preflight");
        } catch (ApplySqlMigrations.MigrationDiagnostic expected) {
            assertContains(expected.getMessage(), "statement=2", "statement diagnostic");
            assertContains(expected.getMessage(), "operation=CREATE INDEX", "operation diagnostic");
            assertContains(expected.getMessage(), "missing column conversation_id", "column diagnostic");
        }
    }

    private static void catalogPreflightRejectsLegacyMessagesCollision() throws Exception {
        String oldMigration = """
                CREATE TABLE IF NOT EXISTS public.messages (
                    id uuid PRIMARY KEY,
                    conversation_id uuid NOT NULL,
                    content text NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_messages_conversation
                    ON public.messages (conversation_id);
                """;
        var plan = ApplySqlMigrations.prepareMigration(Path.of("V_test__old_messages.sql"), oldMigration);
        Map<ApplySqlMigrations.QualifiedName, Set<String>> liveSchema = new HashMap<>();
        liveSchema.put(new ApplySqlMigrations.QualifiedName("public", "messages"), set("id", "content"));
        try {
            ApplySqlMigrations.validateExistingSchema(plan, liveSchema);
            throw new AssertionError("legacy public.messages collision should fail catalog preflight");
        } catch (ApplySqlMigrations.MigrationDiagnostic expected) {
            assertContains(expected.getMessage(), "existing table=public.messages", "legacy table diagnostic");
            assertContains(expected.getMessage(), "conversation_id", "legacy missing column diagnostic");
            assertContains(expected.getMessage(), "CREATE TABLE IF NOT EXISTS", "safe remediation diagnostic");
        }
    }

    private static void correctedConversationMessagesAndCompatibleRerunsPass() throws Exception {
        String corrected = """
                CREATE TABLE IF NOT EXISTS public.conversation_messages (
                    id uuid PRIMARY KEY,
                    conversation_id uuid NOT NULL,
                    content text NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation
                    ON public.conversation_messages (conversation_id, id);
                """;
        var plan = ApplySqlMigrations.prepareMigration(Path.of("V_test__corrected.sql"), corrected);
        Map<ApplySqlMigrations.QualifiedName, Set<String>> partiallyAppliedButCompatible = new HashMap<>();
        partiallyAppliedButCompatible.put(
                new ApplySqlMigrations.QualifiedName("public", "messages"), set("id", "content"));
        partiallyAppliedButCompatible.put(
                new ApplySqlMigrations.QualifiedName("public", "conversation_messages"),
                set("id", "conversation_id", "content"));

        // Existing legacy data is outside the corrected table and is untouched.
        ApplySqlMigrations.validateExistingSchema(plan, partiallyAppliedButCompatible);
        // A second identical validation models a safe rerun of the idempotent DDL.
        ApplySqlMigrations.validateExistingSchema(plan, partiallyAppliedButCompatible);
    }

    private static void failedStatementRollsBackWithoutSuccessOutput() throws Exception {
        FakeJdbc fake = new FakeJdbc(2);
        var plan = planWithTwoStatements();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (PrintStream output = new PrintStream(bytes)) {
            try {
                ApplySqlMigrations.executeMigration(fake.connection(), plan, output);
                throw new AssertionError("synthetic statement failure should escape");
            } catch (ApplySqlMigrations.MigrationDiagnostic expected) {
                assertContains(expected.getMessage(), "file=V_test__transaction.sql", "filename diagnostic");
                assertContains(expected.getMessage(), "statement=2", "failed statement diagnostic");
                assertContains(expected.getMessage(), "lines=3-4", "line diagnostic");
                assertContains(expected.getMessage(), "operation=CREATE INDEX", "operation diagnostic");
                assertContains(expected.getMessage(), "SQLState=42703", "SQLState diagnostic");
                assertFalse(expected.getMessage().contains("secret_payload"), "diagnostic leaked SQL");
            }
        }
        assertEquals(0, fake.commits, "commit count after failure");
        assertEquals(1, fake.rollbacks, "rollback count after failure");
        assertFalse(bytes.toString().contains("Applied "), "success output after rollback");
    }

    private static void successfulMigrationCommitsBeforeSuccessOutput() throws Exception {
        FakeJdbc fake = new FakeJdbc(-1);
        var plan = planWithTwoStatements();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        PrintStream output = new PrintStream(bytes) {
            @Override
            public void println(String value) {
                if (value.startsWith("Applied ") && fake.commits != 1) {
                    throw new AssertionError("Applied was printed before commit");
                }
                super.println(value);
            }
        };
        ApplySqlMigrations.executeMigration(fake.connection(), plan, output);
        output.close();
        assertEquals(1, fake.commits, "success commit count");
        assertEquals(0, fake.rollbacks, "success rollback count");
        assertContains(bytes.toString(), "Applied V_test__transaction.sql", "success output");
    }

    private static ApplySqlMigrations.MigrationPlan planWithTwoStatements() {
        var first = new ApplySqlMigrations.SqlStatementInfo(
                1, 1, 2, "CREATE TABLE public.safe_table (id uuid)", "CREATE TABLE");
        var second = new ApplySqlMigrations.SqlStatementInfo(
                2, 3, 4, "CREATE INDEX secret_payload ON public.safe_table (missing)", "CREATE INDEX");
        return new ApplySqlMigrations.MigrationPlan(
                Path.of("V_test__transaction.sql"), java.util.List.of(first, second), Map.of());
    }

    private static Set<String> set(String... values) {
        return new LinkedHashSet<>(java.util.List.of(values));
    }

    private static void assertContains(String actual, String expected, String label) {
        if (!actual.contains(expected)) {
            throw new AssertionError(label + ": expected <" + expected + "> in <" + actual + ">");
        }
    }

    private static void assertEquals(Object expected, Object actual, String label) {
        if (!expected.equals(actual)) {
            throw new AssertionError(label + ": expected <" + expected + "> but was <" + actual + ">");
        }
    }

    private static void assertFalse(boolean value, String label) {
        if (value) {
            throw new AssertionError(label);
        }
    }

    private static final class FakeJdbc {
        private final int failOnExecute;
        private int executeCount;
        private int commits;
        private int rollbacks;

        private FakeJdbc(int failOnExecute) {
            this.failOnExecute = failOnExecute;
        }

        private Connection connection() {
            Statement statement = (Statement) Proxy.newProxyInstance(
                    getClass().getClassLoader(),
                    new Class<?>[] {Statement.class},
                    (proxy, method, args) -> {
                        if (method.getName().equals("execute")) {
                            executeCount++;
                            if (executeCount == failOnExecute) {
                                throw new SQLException("synthetic secret_payload database error", "42703");
                            }
                            return false;
                        }
                        return defaultValue(method.getReturnType());
                    });
            return (Connection) Proxy.newProxyInstance(
                    getClass().getClassLoader(),
                    new Class<?>[] {Connection.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "createStatement" -> statement;
                        case "setAutoCommit", "close" -> null;
                        case "commit" -> {
                            commits++;
                            yield null;
                        }
                        case "rollback" -> {
                            rollbacks++;
                            yield null;
                        }
                        default -> defaultValue(method.getReturnType());
                    });
        }

        private static Object defaultValue(Class<?> type) {
            if (!type.isPrimitive()) {
                return null;
            }
            if (type == boolean.class) {
                return false;
            }
            if (type == byte.class) {
                return (byte) 0;
            }
            if (type == short.class) {
                return (short) 0;
            }
            if (type == int.class) {
                return 0;
            }
            if (type == long.class) {
                return 0L;
            }
            if (type == float.class) {
                return 0F;
            }
            if (type == double.class) {
                return 0D;
            }
            if (type == char.class) {
                return '\0';
            }
            return null;
        }
    }
}
