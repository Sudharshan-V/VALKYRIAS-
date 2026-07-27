import java.nio.file.Path;
import java.util.List;

public final class ApplySqlMigrationsPathTest {
    private ApplySqlMigrationsPathTest() {}

    public static void main(String[] args) throws Exception {
        if (args.length != 1 || !args[0].matches("(?i)^E:\\\\.*")) {
            throw new AssertionError("Test requires one absolute Windows migration path beginning with E:\\\\");
        }

        String[] runnerArguments = {
                "jdbc:postgresql://example.invalid/postgres",
                "path-test-user",
                args[0]
        };
        List<Path> migrations = ApplySqlMigrations.resolveMigrationPaths(runnerArguments, 2);
        Path expected = Path.of(args[0]).toAbsolutePath().normalize().toRealPath();

        if (migrations.size() != 1 || !migrations.get(0).equals(expected)) {
            throw new AssertionError("The E:\\ migration path was not preserved as one command-line argument");
        }

        System.out.println("Windows E:\\ absolute-path argument test: passed");
    }
}
