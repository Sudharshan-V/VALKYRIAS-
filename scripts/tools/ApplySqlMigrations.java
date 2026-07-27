import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Small, dependency-free PostgreSQL migration runner used by
 * scripts/apply-dynamic-migration.ps1.
 *
 * <p>The runner deliberately performs a lexical/static preflight before the
 * JDBC driver is loaded or a connection is opened. A second, read-only catalog
 * compatibility check protects CREATE TABLE IF NOT EXISTS from silently
 * colliding with an older table that has a different shape.</p>
 */
public final class ApplySqlMigrations {
    private static final int FIRST_MIGRATION_ARGUMENT = 2;
    private static final String PASSWORD_ENVIRONMENT_VARIABLE = "VALKYRIAS_MIGRATION_DB_PASSWORD";

    private static final String IDENTIFIER = "(?:\"(?:[^\"]|\"\")+\"|[A-Za-z_][A-Za-z0-9_$]*)";
    private static final String QUALIFIED_IDENTIFIER = "(?:" + IDENTIFIER + "\\.)?" + IDENTIFIER;
    private static final Pattern CREATE_TABLE = Pattern.compile(
            "(?is)^CREATE\\s+(?:(?:GLOBAL|LOCAL)\\s+)?(?:TEMP(?:ORARY)?\\s+)?(?:UNLOGGED\\s+)?"
                    + "TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(" + QUALIFIED_IDENTIFIER + ")\\s*\\(");
    private static final Pattern ALTER_TABLE = Pattern.compile(
            "(?is)^ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?("
                    + QUALIFIED_IDENTIFIER + ")\\b");
    private static final Pattern ADD_COLUMN = Pattern.compile(
            "(?is)\\bADD\\s+(?:COLUMN\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?(" + IDENTIFIER + ")\\b");
    private static final Pattern CREATE_INDEX = Pattern.compile(
            "(?is)^CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?"
                    + "(?:IF\\s+NOT\\s+EXISTS\\s+)?" + IDENTIFIER
                    + "\\s+ON\\s+(?:ONLY\\s+)?(" + QUALIFIED_IDENTIFIER + ")"
                    + "(?:\\s+USING\\s+" + IDENTIFIER + ")?\\s*\\(");
    private static final Pattern CREATE_POLICY = Pattern.compile(
            "(?is)\\bCREATE\\s+POLICY\\s+" + IDENTIFIER + "\\s+ON\\s+("
                    + QUALIFIED_IDENTIFIER + ")\\b");
    private static final Pattern POLICY_EXPRESSION = Pattern.compile(
            "(?is)\\b(?:USING|WITH\\s+CHECK)\\s*\\(");
    private static final Pattern REFERENCES = Pattern.compile(
            "(?is)\\bREFERENCES\\s+(" + QUALIFIED_IDENTIFIER + ")\\s*\\(([^)]*)\\)");
    private static final Pattern FOREIGN_KEY = Pattern.compile(
            "(?is)\\bFOREIGN\\s+KEY\\s*\\(([^)]*)\\)");

    private static final Set<QualifiedName> EXTERNAL_TABLES = Set.of(
            new QualifiedName("public", "users"),
            new QualifiedName("public", "portfolio_items")
    );

    private static final Set<String> SQL_KEYWORDS = Set.of(
            "all", "and", "any", "array", "as", "asc", "between", "both", "by", "case", "cast",
            "collate", "cross", "current", "default", "desc", "distinct", "else", "end", "escape",
            "except", "exists", "false", "fetch", "filter", "first", "following", "for", "from", "full",
            "group", "having", "ilike", "in", "inner", "intersect", "into", "is", "join", "last", "lateral",
            "leading", "left", "like", "limit", "natural", "not", "null", "nulls", "offset", "on", "only",
            "or", "order", "outer", "over", "partition", "preceding", "range", "returning", "right", "row",
            "rows", "select", "similar", "some", "symmetric", "then", "to", "trailing", "true", "union",
            "unknown", "using", "variadic", "when", "where", "window", "with"
    );

    private ApplySqlMigrations() {}

    public static void main(String[] args) {
        try {
            run(args, System.out);
        } catch (MigrationDiagnostic error) {
            System.err.println(error.getMessage());
            System.exit(1);
        } catch (SQLException error) {
            System.err.println("Migration runner database failure (SQLState=" + safeSqlState(error) + ").");
            System.exit(1);
        } catch (Exception error) {
            System.err.println("Migration runner failed (" + error.getClass().getSimpleName() + ").");
            System.exit(1);
        }
    }

    static void run(String[] args, PrintStream output) throws Exception {
        if (args.length <= FIRST_MIGRATION_ARGUMENT) {
            throw new IllegalArgumentException(
                    "Usage: ApplySqlMigrations <jdbc-url> <username> <migration-file> [migration-file ...]");
        }

        String url = requiredArgument(args[0], "JDBC URL");
        String username = requiredArgument(args[1], "username");
        List<Path> migrationPaths = resolveMigrationPaths(args, FIRST_MIGRATION_ARGUMENT);

        // This entire pass is offline. SQL structure and file compatibility are
        // checked before a password is read, a driver is loaded, or JDBC connects.
        List<MigrationPlan> plans = new ArrayList<>();
        Map<QualifiedName, TableDefinition> tablesDeclaredByEarlierMigrations = new LinkedHashMap<>();
        for (Path migrationPath : migrationPaths) {
            MigrationPlan plan = prepareMigration(
                    migrationPath,
                    Files.readString(migrationPath, StandardCharsets.UTF_8),
                    tablesDeclaredByEarlierMigrations);
            plans.add(plan);
            tablesDeclaredByEarlierMigrations.putAll(plan.declaredTables());
            output.println("Preflight validated: " + migrationPath.getFileName()
                    + " (statements: " + plan.statements().size() + ")");
        }

        String password = requiredEnvironment(PASSWORD_ENVIRONMENT_VARIABLE);
        Class.forName("org.postgresql.Driver");
        Properties properties = new Properties();
        properties.setProperty("user", username);
        properties.setProperty("password", password);
        properties.setProperty("sslmode", "require");

        try (Connection connection = DriverManager.getConnection(url, properties)) {
            // Read-only metadata inspection: no statement from a migration has
            // run yet. This catches legacy IF NOT EXISTS table-name collisions.
            connection.setReadOnly(true);
            try {
                for (MigrationPlan plan : plans) {
                    validateExistingTableCompatibility(connection, plan);
                }
            } finally {
                connection.setReadOnly(false);
            }
            for (MigrationPlan plan : plans) {
                executeMigration(connection, plan, output);
            }
        }
    }

    static List<Path> resolveMigrationPaths(String[] args, int firstMigrationArgument) throws Exception {
        Path migrationRoot = Path.of("database", "migrations").toRealPath();
        List<Path> migrations = new ArrayList<>();
        for (int i = firstMigrationArgument; i < args.length; i++) {
            Path migrationPath = Path.of(args[i])
                    .toAbsolutePath()
                    .normalize();

            boolean isRegularFile = Files.isRegularFile(migrationPath);
            System.out.println("Migration file: " + migrationPath.getFileName()
                    + " (Files.isRegularFile: " + isRegularFile + ")");
            if (!isRegularFile) {
                throw new NoSuchFileException(migrationPath.toString());
            }

            Path realMigrationPath = migrationPath.toRealPath();
            if (!realMigrationPath.startsWith(migrationRoot)
                    || !realMigrationPath.getFileName().toString().matches("V[0-9_]+__.+\\.sql")) {
                throw new IllegalArgumentException("Only versioned files under database/migrations may be executed");
            }
            migrations.add(realMigrationPath);
        }
        return migrations;
    }

    static MigrationPlan prepareMigration(Path migrationPath) throws Exception {
        String sql = Files.readString(migrationPath, StandardCharsets.UTF_8);
        return prepareMigration(migrationPath, sql);
    }

    static MigrationPlan prepareMigration(Path migrationPath, String sql) throws Exception {
        return prepareMigration(migrationPath, sql, Map.of());
    }

    static MigrationPlan prepareMigration(
            Path migrationPath,
            String sql,
            Map<QualifiedName, TableDefinition> tablesDeclaredByEarlierMigrations
    ) throws Exception {
        List<SqlStatementInfo> splitStatements = splitPostgresStatements(sql);
        List<SqlStatementInfo> executableStatements = new ArrayList<>();
        for (SqlStatementInfo statement : splitStatements) {
            String leadingSql = stripLeadingWhitespaceAndComments(statement.sql());
            if (leadingSql.matches("(?is)^BEGIN(?:\\s+(?:WORK|TRANSACTION))?\\s*$")
                    || leadingSql.matches("(?is)^COMMIT(?:\\s+(?:WORK|TRANSACTION))?\\s*$")) {
                continue;
            }
            rejectNonTransactionalStatement(migrationPath, statement, leadingSql);
            executableStatements.add(new SqlStatementInfo(
                    executableStatements.size() + 1,
                    statement.startLine(),
                    statement.endLine(),
                    statement.sql(),
                    sanitizedOperation(leadingSql)));
        }
        if (executableStatements.isEmpty()) {
            throw preflightFailure(migrationPath, 0, 1, 1, "EMPTY", "migration contains no executable statements");
        }

        MigrationPlan plan = buildAndValidateSchemaPlan(
                migrationPath, executableStatements, tablesDeclaredByEarlierMigrations);
        return plan;
    }

    /** PostgreSQL-aware statement splitter (quotes, comments and dollar tags). */
    static List<SqlStatementInfo> splitPostgresStatements(String sql) throws MigrationDiagnostic {
        if (sql == null) {
            throw new IllegalArgumentException("SQL is required");
        }
        List<SqlStatementInfo> result = new ArrayList<>();
        int statementStart = 0;
        int statementStartLine = 1;
        int line = 1;
        int blockCommentDepth = 0;
        LexicalState state = LexicalState.NORMAL;
        String dollarTag = null;

        for (int i = 0; i < sql.length(); i++) {
            char current = sql.charAt(i);
            char next = i + 1 < sql.length() ? sql.charAt(i + 1) : '\0';

            if (current == '\n') {
                line++;
            }

            switch (state) {
                case NORMAL -> {
                    if (current == '-' && next == '-') {
                        state = LexicalState.LINE_COMMENT;
                        i++;
                    } else if (current == '/' && next == '*') {
                        state = LexicalState.BLOCK_COMMENT;
                        blockCommentDepth = 1;
                        i++;
                    } else if (current == '\'') {
                        state = LexicalState.SINGLE_QUOTE;
                    } else if (current == '"') {
                        state = LexicalState.DOUBLE_QUOTE;
                    } else if (current == '$') {
                        String candidate = dollarTagAt(sql, i);
                        if (candidate != null) {
                            state = LexicalState.DOLLAR_QUOTE;
                            dollarTag = candidate;
                            i += candidate.length() - 1;
                        }
                    } else if (current == ';') {
                        appendStatement(result, sql, statementStart, i, statementStartLine, line);
                        statementStart = i + 1;
                        statementStartLine = line;
                    }
                }
                case SINGLE_QUOTE -> {
                    if (current == '\\' && next != '\0') {
                        // Supports PostgreSQL E'...' escape strings. In ordinary
                        // strings this is conservative and cannot split too early.
                        if (next == '\n') {
                            line++;
                        }
                        i++;
                    } else if (current == '\'' && next == '\'') {
                        i++;
                    } else if (current == '\'') {
                        state = LexicalState.NORMAL;
                    }
                }
                case DOUBLE_QUOTE -> {
                    if (current == '"' && next == '"') {
                        i++;
                    } else if (current == '"') {
                        state = LexicalState.NORMAL;
                    }
                }
                case LINE_COMMENT -> {
                    if (current == '\n') {
                        state = LexicalState.NORMAL;
                    }
                }
                case BLOCK_COMMENT -> {
                    if (current == '/' && next == '*') {
                        blockCommentDepth++;
                        i++;
                    } else if (current == '*' && next == '/') {
                        blockCommentDepth--;
                        i++;
                        if (blockCommentDepth == 0) {
                            state = LexicalState.NORMAL;
                        }
                    }
                }
                case DOLLAR_QUOTE -> {
                    if (sql.startsWith(dollarTag, i)) {
                        i += dollarTag.length() - 1;
                        state = LexicalState.NORMAL;
                        dollarTag = null;
                    }
                }
            }
        }

        if (state != LexicalState.NORMAL && state != LexicalState.LINE_COMMENT) {
            throw new MigrationDiagnostic("SQL preflight failed: unterminated " + state.description + ".");
        }
        appendStatement(result, sql, statementStart, sql.length(), statementStartLine, line);
        return result;
    }

    private static void appendStatement(
            List<SqlStatementInfo> result,
            String sql,
            int start,
            int end,
            int startLine,
            int endLine) {
        String candidate = sql.substring(start, end).trim();
        if (stripLeadingWhitespaceAndComments(candidate).isBlank()) {
            return;
        }
        int contentLine = startLine + leadingLineCountBeforeContent(sql.substring(start, end));
        result.add(new SqlStatementInfo(result.size() + 1, contentLine, endLine, candidate,
                sanitizedOperation(stripLeadingWhitespaceAndComments(candidate))));
    }

    private static int leadingLineCountBeforeContent(String value) {
        int lines = 0;
        int i = 0;
        while (i < value.length()) {
            if (Character.isWhitespace(value.charAt(i))) {
                if (value.charAt(i) == '\n') {
                    lines++;
                }
                i++;
                continue;
            }
            if (value.startsWith("--", i)) {
                int end = value.indexOf('\n', i + 2);
                if (end < 0) {
                    return lines;
                }
                lines++;
                i = end + 1;
                continue;
            }
            if (value.startsWith("/*", i)) {
                int depth = 1;
                i += 2;
                while (i < value.length() && depth > 0) {
                    if (value.startsWith("/*", i)) {
                        depth++;
                        i += 2;
                    } else if (value.startsWith("*/", i)) {
                        depth--;
                        i += 2;
                    } else {
                        if (value.charAt(i) == '\n') {
                            lines++;
                        }
                        i++;
                    }
                }
                continue;
            }
            break;
        }
        return lines;
    }

    private static String dollarTagAt(String sql, int offset) {
        int closingDollar = sql.indexOf('$', offset + 1);
        if (closingDollar < 0) {
            return null;
        }
        String body = sql.substring(offset + 1, closingDollar);
        if (body.isEmpty() || body.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            return sql.substring(offset, closingDollar + 1);
        }
        return null;
    }

    private static MigrationPlan buildAndValidateSchemaPlan(
            Path migrationPath,
            List<SqlStatementInfo> statements,
            Map<QualifiedName, TableDefinition> tablesDeclaredByEarlierMigrations
    ) throws MigrationDiagnostic {
        Map<QualifiedName, TableDefinition> plannedTables = new LinkedHashMap<>();
        for (SqlStatementInfo statement : statements) {
            TableDefinition definition = parseCreateTable(statement);
            if (definition != null) {
                plannedTables.put(definition.name(), definition);
            }
        }

        Map<QualifiedName, TableDefinition> availableTables = new HashMap<>();
        for (QualifiedName external : EXTERNAL_TABLES) {
            availableTables.put(external, TableDefinition.external(external));
        }
        for (TableDefinition inherited : tablesDeclaredByEarlierMigrations.values()) {
            availableTables.put(inherited.name(), new TableDefinition(
                    inherited.name(),
                    new LinkedHashSet<>(inherited.columns()),
                    inherited.columnsKnown(),
                    inherited.ifNotExists()));
        }

        for (SqlStatementInfo statement : statements) {
            String leadingSql = stripLeadingWhitespaceAndComments(statement.sql());
            TableDefinition created = parseCreateTable(statement);
            if (created != null) {
                availableTables.put(created.name(), created);
                validateForeignKeys(migrationPath, statement, created, plannedTables, availableTables);
                continue;
            }

            Matcher alterMatcher = ALTER_TABLE.matcher(leadingSql);
            if (alterMatcher.find()) {
                QualifiedName alteredTable = qualifiedName(alterMatcher.group(1));
                TableDefinition table = availableTables.get(alteredTable);
                if (table == null) {
                    if (plannedTables.containsKey(alteredTable)) {
                        throw preflightFailure(migrationPath, statement,
                                "ALTER TABLE references " + alteredTable.display() + " before it is created");
                    }
                    if (!EXTERNAL_TABLES.contains(alteredTable)) {
                        throw preflightFailure(migrationPath, statement,
                                "ALTER TABLE references undeclared table " + alteredTable.display());
                    }
                    table = TableDefinition.external(alteredTable);
                    availableTables.put(alteredTable, table);
                }
                Matcher addColumn = ADD_COLUMN.matcher(leadingSql.substring(alterMatcher.end()));
                while (addColumn.find()) {
                    table.columns().add(normalizeIdentifier(addColumn.group(1)));
                }
                validateForeignKeys(migrationPath, statement, table, plannedTables, availableTables);
            }

            Matcher indexMatcher = CREATE_INDEX.matcher(leadingSql);
            if (indexMatcher.find()) {
                QualifiedName indexedTable = qualifiedName(indexMatcher.group(1));
                TableDefinition table = requireAvailableTable(
                        migrationPath, statement, indexedTable, plannedTables, availableTables, "index");
                if (table.columnsKnown()) {
                    int openingParenthesis = indexMatcher.end() - 1;
                    int closingParenthesis = matchingParenthesis(leadingSql, openingParenthesis);
                    if (closingParenthesis < 0) {
                        throw preflightFailure(migrationPath, statement, "index column list is not balanced");
                    }
                    String expressions = leadingSql.substring(openingParenthesis + 1, closingParenthesis)
                            + " " + leadingSql.substring(closingParenthesis + 1);
                    validateExpressionColumns(migrationPath, statement, table, expressions, "index");
                }
            }

            validatePolicies(migrationPath, statement, plannedTables, availableTables);
        }

        return new MigrationPlan(migrationPath, List.copyOf(statements), Map.copyOf(plannedTables));
    }

    private static TableDefinition parseCreateTable(SqlStatementInfo statement) throws MigrationDiagnostic {
        String leadingSql = stripLeadingWhitespaceAndComments(statement.sql());
        Matcher matcher = CREATE_TABLE.matcher(leadingSql);
        if (!matcher.find()) {
            return null;
        }
        QualifiedName name = qualifiedName(matcher.group(2));
        int openingParenthesis = matcher.end() - 1;
        int closingParenthesis = matchingParenthesis(leadingSql, openingParenthesis);
        if (closingParenthesis < 0) {
            throw new MigrationDiagnostic("SQL preflight failed: CREATE TABLE column list is not balanced.");
        }

        Set<String> columns = new LinkedHashSet<>();
        for (String item : splitTopLevelComma(leadingSql.substring(openingParenthesis + 1, closingParenthesis))) {
            String trimmed = stripLeadingWhitespaceAndComments(item);
            Matcher identifier = Pattern.compile("(?is)^(" + IDENTIFIER + ")\\b").matcher(trimmed);
            if (!identifier.find()) {
                continue;
            }
            String candidate = normalizeIdentifier(identifier.group(1));
            if (!Set.of("constraint", "primary", "unique", "check", "exclude", "foreign", "like").contains(candidate)) {
                columns.add(candidate);
            }
        }
        return new TableDefinition(name, columns, true, matcher.group(1) != null);
    }

    private static void validateForeignKeys(
            Path migrationPath,
            SqlStatementInfo statement,
            TableDefinition source,
            Map<QualifiedName, TableDefinition> plannedTables,
            Map<QualifiedName, TableDefinition> availableTables) throws MigrationDiagnostic {
        String sql = stripLeadingWhitespaceAndComments(statement.sql());
        Matcher localKeys = FOREIGN_KEY.matcher(sql);
        while (localKeys.find()) {
            if (source.columnsKnown()) {
                for (String column : identifiersFromCommaList(localKeys.group(1))) {
                    if (!source.columns().contains(column)) {
                        throw preflightFailure(migrationPath, statement,
                                "foreign key references missing local column " + column
                                        + " on " + source.name().display());
                    }
                }
            }
        }

        Matcher references = REFERENCES.matcher(sql);
        while (references.find()) {
            QualifiedName targetName = qualifiedName(references.group(1));
            TableDefinition target = requireAvailableTable(
                    migrationPath, statement, targetName, plannedTables, availableTables, "foreign key");
            if (target.columnsKnown()) {
                for (String targetColumn : identifiersFromCommaList(references.group(2))) {
                    if (!target.columns().contains(targetColumn)) {
                        throw preflightFailure(migrationPath, statement,
                                "foreign key references missing target column " + targetColumn
                                        + " on " + target.name().display());
                    }
                }
            }
        }
    }

    private static void validatePolicies(
            Path migrationPath,
            SqlStatementInfo statement,
            Map<QualifiedName, TableDefinition> plannedTables,
            Map<QualifiedName, TableDefinition> availableTables) throws MigrationDiagnostic {
        String sql = stripLeadingWhitespaceAndComments(statement.sql());
        Matcher matcher = CREATE_POLICY.matcher(sql);
        List<PolicyLocation> policies = new ArrayList<>();
        while (matcher.find()) {
            policies.add(new PolicyLocation(matcher.start(), matcher.end(), qualifiedName(matcher.group(1))));
        }
        for (int i = 0; i < policies.size(); i++) {
            PolicyLocation policy = policies.get(i);
            int end = i + 1 < policies.size() ? policies.get(i + 1).start() : sql.length();
            TableDefinition table = requireAvailableTable(
                    migrationPath, statement, policy.table(), plannedTables, availableTables, "policy");
            if (!table.columnsKnown()) {
                continue;
            }
            String policySql = sql.substring(policy.end(), end);
            Matcher expressionMatcher = POLICY_EXPRESSION.matcher(policySql);
            while (expressionMatcher.find()) {
                int openingParenthesis = expressionMatcher.end() - 1;
                int closingParenthesis = matchingParenthesis(policySql, openingParenthesis);
                if (closingParenthesis < 0) {
                    throw preflightFailure(migrationPath, statement, "policy expression is not balanced");
                }
                validateExpressionColumns(
                        migrationPath,
                        statement,
                        table,
                        policySql.substring(openingParenthesis + 1, closingParenthesis),
                        "policy");
            }
        }
    }

    private static TableDefinition requireAvailableTable(
            Path migrationPath,
            SqlStatementInfo statement,
            QualifiedName tableName,
            Map<QualifiedName, TableDefinition> plannedTables,
            Map<QualifiedName, TableDefinition> availableTables,
            String objectType) throws MigrationDiagnostic {
        TableDefinition table = availableTables.get(tableName);
        if (table != null) {
            return table;
        }
        if (plannedTables.containsKey(tableName)) {
            throw preflightFailure(migrationPath, statement,
                    objectType + " references " + tableName.display() + " before it is created");
        }
        throw preflightFailure(migrationPath, statement,
                objectType + " references undeclared table " + tableName.display());
    }

    private static void validateExpressionColumns(
            Path migrationPath,
            SqlStatementInfo statement,
            TableDefinition table,
            String expression,
            String objectType) throws MigrationDiagnostic {
        for (String identifier : unqualifiedExpressionIdentifiers(expression)) {
            if (!table.columns().contains(identifier)) {
                throw preflightFailure(migrationPath, statement,
                        objectType + " references missing column " + identifier
                                + " on " + table.name().display());
            }
        }
    }

    static void validateExistingTableCompatibility(Connection connection, MigrationPlan plan)
            throws SQLException, MigrationDiagnostic {
        Map<QualifiedName, Set<String>> existingTables = readExistingTableColumns(connection, plan.declaredTables().values());
        validateExistingSchema(plan, existingTables);
    }

    static void validateExistingSchema(MigrationPlan plan, Map<QualifiedName, Set<String>> existingTables)
            throws MigrationDiagnostic {
        for (TableDefinition desired : plan.declaredTables().values()) {
            if (!desired.ifNotExists()) {
                continue;
            }
            Set<String> actualColumns = existingTables.get(desired.name());
            if (actualColumns == null) {
                continue;
            }
            List<String> missing = new ArrayList<>();
            for (String desiredColumn : desired.columns()) {
                if (!actualColumns.contains(desiredColumn)) {
                    missing.add(desiredColumn);
                }
            }
            if (!missing.isEmpty()) {
                Collections.sort(missing);
                throw new MigrationDiagnostic(
                        "Migration catalog preflight failed: file=" + plan.path().getFileName()
                                + "; existing table=" + desired.name().display()
                                + "; missing declared columns=" + String.join(",", missing)
                                + ". CREATE TABLE IF NOT EXISTS cannot repair an incompatible legacy table.");
            }
        }
    }

    private static Map<QualifiedName, Set<String>> readExistingTableColumns(
            Connection connection,
            Collection<TableDefinition> desiredTables) throws SQLException {
        Map<QualifiedName, Set<String>> result = new LinkedHashMap<>();
        DatabaseMetaData metadata = connection.getMetaData();
        String catalog = connection.getCatalog();
        for (TableDefinition desired : desiredTables) {
            if (!desired.ifNotExists()) {
                continue;
            }
            boolean exists = false;
            try (ResultSet tables = metadata.getTables(catalog, desired.name().schema(), desired.name().table(), null)) {
                while (tables.next()) {
                    String schema = tables.getString("TABLE_SCHEM");
                    String table = tables.getString("TABLE_NAME");
                    if (desired.name().matches(schema, table)) {
                        exists = true;
                        break;
                    }
                }
            }
            if (!exists) {
                continue;
            }
            Set<String> columns = new HashSet<>();
            try (ResultSet columnRows = metadata.getColumns(
                    catalog, desired.name().schema(), desired.name().table(), null)) {
                while (columnRows.next()) {
                    columns.add(columnRows.getString("COLUMN_NAME").toLowerCase(Locale.ROOT));
                }
            }
            result.put(desired.name(), columns);
        }
        return result;
    }

    /** Executes exactly one migration in exactly one JDBC transaction. */
    static void executeMigration(Connection connection, MigrationPlan plan, PrintStream output)
            throws MigrationDiagnostic {
        output.println("Applying " + plan.path().getFileName());
        SqlStatementInfo activeStatement = null;
        try {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                for (SqlStatementInfo candidate : plan.statements()) {
                    activeStatement = candidate;
                    statement.execute(candidate.sql());
                }
            }
            // Success is announced only after this returns successfully.
            connection.commit();
            output.println("Applied " + plan.path().getFileName());
        } catch (Exception failure) {
            SQLException rollbackFailure = null;
            try {
                connection.rollback();
            } catch (SQLException rollbackError) {
                rollbackFailure = rollbackError;
            }
            int statementNumber = activeStatement == null ? 0 : activeStatement.number();
            int startLine = activeStatement == null ? 1 : activeStatement.startLine();
            int endLine = activeStatement == null ? 1 : activeStatement.endLine();
            String operation = activeStatement == null ? "TRANSACTION" : activeStatement.operation();
            String state = failure instanceof SQLException sqlFailure ? safeSqlState(sqlFailure) : "n/a";
            String rollbackState = rollbackFailure == null ? "" : "; rollbackSQLState=" + safeSqlState(rollbackFailure);
            throw new MigrationDiagnostic(
                    "Migration failed: file=" + plan.path().getFileName()
                            + "; statement=" + statementNumber
                            + "; lines=" + startLine + "-" + endLine
                            + "; operation=" + operation
                            + "; SQLState=" + state + rollbackState + ".",
                    failure);
        }
    }

    private static void rejectNonTransactionalStatement(
            Path migrationPath,
            SqlStatementInfo statement,
            String leadingSql) throws MigrationDiagnostic {
        String normalized = leadingSql.replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
        boolean unsupported = normalized.matches("^(VACUUM|CREATE DATABASE|DROP DATABASE|CREATE TABLESPACE|DROP TABLESPACE|ALTER SYSTEM)\\b.*")
                || normalized.matches("^CREATE (?:UNIQUE )?INDEX CONCURRENTLY\\b.*")
                || normalized.matches("^REINDEX\\b.*\\bCONCURRENTLY\\b.*");
        if (unsupported) {
            throw preflightFailure(migrationPath, statement,
                    "operation cannot run inside the required per-migration transaction");
        }
    }

    private static List<String> unqualifiedExpressionIdentifiers(String expression) {
        List<Token> tokens = expressionTokens(expression);
        Set<String> aliases = new HashSet<>();
        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i).identifier()
                    && Set.of("from", "join").contains(tokens.get(i).normalized())) {
                int cursor = i + 1;
                while (cursor < tokens.size() && !tokens.get(cursor).identifier()) {
                    cursor++;
                }
                if (cursor < tokens.size()) {
                    cursor++;
                    if (cursor < tokens.size() && tokens.get(cursor).isSymbol(".")) {
                        cursor += 2;
                    }
                    if (cursor < tokens.size() && tokens.get(cursor).identifier()
                            && !SQL_KEYWORDS.contains(tokens.get(cursor).normalized())) {
                        aliases.add(tokens.get(cursor).normalized());
                    }
                }
            }
        }

        LinkedHashSet<String> identifiers = new LinkedHashSet<>();
        for (int i = 0; i < tokens.size(); i++) {
            Token token = tokens.get(i);
            if (!token.identifier()) {
                continue;
            }
            String value = token.normalized();
            Token previous = i > 0 ? tokens.get(i - 1) : null;
            Token next = i + 1 < tokens.size() ? tokens.get(i + 1) : null;
            if (SQL_KEYWORDS.contains(value) || aliases.contains(value)
                    || (previous != null && previous.isSymbol("."))
                    || (next != null && (next.isSymbol(".") || next.isSymbol("(")))) {
                continue;
            }
            identifiers.add(value);
        }
        return List.copyOf(identifiers);
    }

    private static List<Token> expressionTokens(String expression) {
        List<Token> tokens = new ArrayList<>();
        int i = 0;
        while (i < expression.length()) {
            char current = expression.charAt(i);
            if (Character.isWhitespace(current)) {
                i++;
            } else if (current == '\'' ) {
                i = skipSingleQuoted(expression, i);
            } else if (current == '"') {
                StringBuilder identifier = new StringBuilder();
                i++;
                while (i < expression.length()) {
                    if (expression.charAt(i) == '"') {
                        if (i + 1 < expression.length() && expression.charAt(i + 1) == '"') {
                            identifier.append('"');
                            i += 2;
                        } else {
                            i++;
                            break;
                        }
                    } else {
                        identifier.append(expression.charAt(i++));
                    }
                }
                tokens.add(Token.identifier(identifier.toString()));
            } else if (current == '-' && i + 1 < expression.length() && expression.charAt(i + 1) == '-') {
                int newline = expression.indexOf('\n', i + 2);
                i = newline < 0 ? expression.length() : newline + 1;
            } else if (current == '/' && i + 1 < expression.length() && expression.charAt(i + 1) == '*') {
                i = skipNestedBlockComment(expression, i);
            } else if (current == '$') {
                String tag = dollarTagAt(expression, i);
                if (tag == null) {
                    tokens.add(Token.symbol(String.valueOf(current)));
                    i++;
                } else {
                    int closing = expression.indexOf(tag, i + tag.length());
                    i = closing < 0 ? expression.length() : closing + tag.length();
                }
            } else if (Character.isLetter(current) || current == '_') {
                int end = i + 1;
                while (end < expression.length()) {
                    char candidate = expression.charAt(end);
                    if (!Character.isLetterOrDigit(candidate) && candidate != '_' && candidate != '$') {
                        break;
                    }
                    end++;
                }
                tokens.add(Token.identifier(expression.substring(i, end)));
                i = end;
            } else {
                tokens.add(Token.symbol(String.valueOf(current)));
                i++;
            }
        }
        return tokens;
    }

    private static int skipSingleQuoted(String value, int start) {
        int i = start + 1;
        while (i < value.length()) {
            if (value.charAt(i) == '\\' && i + 1 < value.length()) {
                i += 2;
            } else if (value.charAt(i) == '\'' && i + 1 < value.length() && value.charAt(i + 1) == '\'') {
                i += 2;
            } else if (value.charAt(i) == '\'') {
                return i + 1;
            } else {
                i++;
            }
        }
        return i;
    }

    private static int skipNestedBlockComment(String value, int start) {
        int depth = 1;
        int i = start + 2;
        while (i < value.length() && depth > 0) {
            if (value.startsWith("/*", i)) {
                depth++;
                i += 2;
            } else if (value.startsWith("*/", i)) {
                depth--;
                i += 2;
            } else {
                i++;
            }
        }
        return i;
    }

    private static int matchingParenthesis(String value, int openingParenthesis) {
        int depth = 0;
        LexicalState state = LexicalState.NORMAL;
        int blockDepth = 0;
        String dollarTag = null;
        for (int i = openingParenthesis; i < value.length(); i++) {
            char current = value.charAt(i);
            char next = i + 1 < value.length() ? value.charAt(i + 1) : '\0';
            switch (state) {
                case NORMAL -> {
                    if (current == '\'') {
                        state = LexicalState.SINGLE_QUOTE;
                    } else if (current == '"') {
                        state = LexicalState.DOUBLE_QUOTE;
                    } else if (current == '-' && next == '-') {
                        state = LexicalState.LINE_COMMENT;
                        i++;
                    } else if (current == '/' && next == '*') {
                        state = LexicalState.BLOCK_COMMENT;
                        blockDepth = 1;
                        i++;
                    } else if (current == '$') {
                        String candidate = dollarTagAt(value, i);
                        if (candidate != null) {
                            state = LexicalState.DOLLAR_QUOTE;
                            dollarTag = candidate;
                            i += candidate.length() - 1;
                        }
                    } else if (current == '(') {
                        depth++;
                    } else if (current == ')' && --depth == 0) {
                        return i;
                    }
                }
                case SINGLE_QUOTE -> {
                    if (current == '\\' && next != '\0') {
                        i++;
                    } else if (current == '\'' && next == '\'') {
                        i++;
                    } else if (current == '\'') {
                        state = LexicalState.NORMAL;
                    }
                }
                case DOUBLE_QUOTE -> {
                    if (current == '"' && next == '"') {
                        i++;
                    } else if (current == '"') {
                        state = LexicalState.NORMAL;
                    }
                }
                case LINE_COMMENT -> {
                    if (current == '\n') {
                        state = LexicalState.NORMAL;
                    }
                }
                case BLOCK_COMMENT -> {
                    if (current == '/' && next == '*') {
                        blockDepth++;
                        i++;
                    } else if (current == '*' && next == '/') {
                        blockDepth--;
                        i++;
                        if (blockDepth == 0) {
                            state = LexicalState.NORMAL;
                        }
                    }
                }
                case DOLLAR_QUOTE -> {
                    if (value.startsWith(dollarTag, i)) {
                        i += dollarTag.length() - 1;
                        state = LexicalState.NORMAL;
                    }
                }
            }
        }
        return -1;
    }

    private static List<String> splitTopLevelComma(String value) {
        List<String> result = new ArrayList<>();
        int start = 0;
        int depth = 0;
        LexicalState state = LexicalState.NORMAL;
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            char next = i + 1 < value.length() ? value.charAt(i + 1) : '\0';
            if (state == LexicalState.NORMAL) {
                if (current == '\'') {
                    state = LexicalState.SINGLE_QUOTE;
                } else if (current == '"') {
                    state = LexicalState.DOUBLE_QUOTE;
                } else if (current == '(') {
                    depth++;
                } else if (current == ')') {
                    depth--;
                } else if (current == ',' && depth == 0) {
                    result.add(value.substring(start, i));
                    start = i + 1;
                }
            } else if (state == LexicalState.SINGLE_QUOTE) {
                if (current == '\\' && next != '\0') {
                    i++;
                } else if (current == '\'' && next == '\'') {
                    i++;
                } else if (current == '\'') {
                    state = LexicalState.NORMAL;
                }
            } else if (state == LexicalState.DOUBLE_QUOTE) {
                if (current == '"' && next == '"') {
                    i++;
                } else if (current == '"') {
                    state = LexicalState.NORMAL;
                }
            }
        }
        result.add(value.substring(start));
        return result;
    }

    private static List<String> identifiersFromCommaList(String value) {
        List<String> result = new ArrayList<>();
        for (String item : value.split(",")) {
            String trimmed = item.trim();
            if (trimmed.matches(IDENTIFIER)) {
                result.add(normalizeIdentifier(trimmed));
            }
        }
        return result;
    }

    private static String stripLeadingWhitespaceAndComments(String value) {
        int i = 0;
        while (i < value.length()) {
            while (i < value.length() && Character.isWhitespace(value.charAt(i))) {
                i++;
            }
            if (value.startsWith("--", i)) {
                int newline = value.indexOf('\n', i + 2);
                i = newline < 0 ? value.length() : newline + 1;
            } else if (value.startsWith("/*", i)) {
                i = skipNestedBlockComment(value, i);
            } else {
                break;
            }
        }
        return value.substring(i).trim();
    }

    private static String sanitizedOperation(String sql) {
        String normalized = sql.replaceAll("\\s+", " ").trim().toUpperCase(Locale.ROOT);
        List<String> operations = List.of(
                "CREATE OR REPLACE FUNCTION", "CREATE OR REPLACE PROCEDURE", "CREATE UNIQUE INDEX",
                "CREATE INDEX", "CREATE TABLE", "CREATE POLICY", "CREATE FUNCTION", "CREATE TRIGGER",
                "ALTER TABLE", "ALTER PUBLICATION", "DROP POLICY", "DROP TRIGGER", "INSERT", "UPDATE",
                "DELETE", "GRANT", "REVOKE", "COMMENT", "DO", "SELECT");
        for (String operation : operations) {
            if (normalized.matches("^" + operation.replace(" ", "\\s+") + "\\b.*")) {
                return operation;
            }
        }
        return "OTHER";
    }

    private static QualifiedName qualifiedName(String value) {
        List<String> parts = splitQualifiedIdentifier(value);
        if (parts.size() == 1) {
            return new QualifiedName("public", normalizeIdentifier(parts.get(0)));
        }
        return new QualifiedName(normalizeIdentifier(parts.get(0)), normalizeIdentifier(parts.get(1)));
    }

    private static List<String> splitQualifiedIdentifier(String value) {
        boolean quoted = false;
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (current == '"') {
                if (quoted && i + 1 < value.length() && value.charAt(i + 1) == '"') {
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (current == '.' && !quoted) {
                return List.of(value.substring(0, i), value.substring(i + 1));
            }
        }
        return List.of(value);
    }

    private static String normalizeIdentifier(String value) {
        String trimmed = value.trim();
        if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            return trimmed.substring(1, trimmed.length() - 1).replace("\"\"", "\"");
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }

    private static MigrationDiagnostic preflightFailure(
            Path path, SqlStatementInfo statement, String detail) {
        return preflightFailure(path, statement.number(), statement.startLine(), statement.endLine(),
                statement.operation(), detail);
    }

    private static MigrationDiagnostic preflightFailure(
            Path path, int statement, int startLine, int endLine, String operation, String detail) {
        return new MigrationDiagnostic(
                "SQL preflight failed: file=" + path.getFileName()
                        + "; statement=" + statement
                        + "; lines=" + startLine + "-" + endLine
                        + "; operation=" + operation
                        + "; reason=" + detail + ".");
    }

    private static String requiredArgument(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required");
        }
        return value;
    }

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required");
        }
        return value;
    }

    private static String safeSqlState(SQLException error) {
        String sqlState = error.getSQLState();
        return sqlState == null || !sqlState.matches("[A-Za-z0-9]{5}") ? "unknown" : sqlState;
    }

    private enum LexicalState {
        NORMAL("SQL"),
        SINGLE_QUOTE("single-quoted string"),
        DOUBLE_QUOTE("quoted identifier"),
        LINE_COMMENT("line comment"),
        BLOCK_COMMENT("block comment"),
        DOLLAR_QUOTE("dollar-quoted body");

        private final String description;

        LexicalState(String description) {
            this.description = description;
        }
    }

    record SqlStatementInfo(int number, int startLine, int endLine, String sql, String operation) {}

    record MigrationPlan(
            Path path,
            List<SqlStatementInfo> statements,
            Map<QualifiedName, TableDefinition> declaredTables) {}

    record QualifiedName(String schema, String table) {
        String display() {
            return schema + "." + table;
        }

        boolean matches(String actualSchema, String actualTable) {
            return actualSchema != null && actualTable != null
                    && schema.equalsIgnoreCase(actualSchema)
                    && table.equalsIgnoreCase(actualTable);
        }
    }

    record TableDefinition(
            QualifiedName name,
            Set<String> columns,
            boolean columnsKnown,
            boolean ifNotExists) {
        static TableDefinition external(QualifiedName name) {
            return new TableDefinition(name, new LinkedHashSet<>(), false, false);
        }
    }

    record PolicyLocation(int start, int end, QualifiedName table) {}

    record Token(String value, boolean identifier) {
        static Token identifier(String value) {
            return new Token(value, true);
        }

        static Token symbol(String value) {
            return new Token(value, false);
        }

        String normalized() {
            return value.toLowerCase(Locale.ROOT);
        }

        boolean isSymbol(String expected) {
            return !identifier && value.equals(expected);
        }
    }

    static final class MigrationDiagnostic extends Exception {
        MigrationDiagnostic(String message) {
            super(message);
        }

        MigrationDiagnostic(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
