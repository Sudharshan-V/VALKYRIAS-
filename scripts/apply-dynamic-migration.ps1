[CmdletBinding()]
param(
    [string[]]$Migration = @(
        'database/migrations/V20260722_01__create_dynamic_application_domain.sql',
        'database/migrations/V20260726_01__add_security_deposit_gst_and_coupons.sql'
    )
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$migrationPasswordVariable = 'VALKYRIAS_MIGRATION_DB_PASSWORD'
$previousMigrationPassword = [Environment]::GetEnvironmentVariable($migrationPasswordVariable, 'Process')
$passwordPointer = [IntPtr]::Zero
$securePassword = $null
$compileDirectory = $null
$locationWasPushed = $false

function Import-NonSecretDatabaseSettings {
    $envFile = Join-Path $projectRoot '.env.local'
    if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) { return }
    foreach ($line in Get-Content -LiteralPath $envFile) {
        if ($line -match '^\s*(SPRING_DATASOURCE_URL|SPRING_DATASOURCE_USERNAME)\s*=\s*(.*)\s*$') {
            $name = $matches[1]
            $value = $matches[2].Trim().Trim('"').Trim("'")
            if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, 'Process'))) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}

try {
    Push-Location $projectRoot
    $locationWasPushed = $true
    Import-NonSecretDatabaseSettings

    if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_URL)) {
        $env:SPRING_DATASOURCE_URL = Read-Host 'Supabase PostgreSQL JDBC URL'
    }
    if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_USERNAME)) {
        $env:SPRING_DATASOURCE_USERNAME = Read-Host 'Supabase PostgreSQL username'
    }
    $migrationPassword = $env:SPRING_DATASOURCE_PASSWORD
    if ([string]::IsNullOrWhiteSpace($migrationPassword)) {
        $securePassword = Read-Host 'Supabase PostgreSQL password' -AsSecureString
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $migrationPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    }
    [Environment]::SetEnvironmentVariable($migrationPasswordVariable, $migrationPassword, 'Process')

    $java = if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        Join-Path $env:JAVA_HOME 'bin\java.exe'
    } else {
        (Get-Command java -ErrorAction Stop).Source
    }
    $javac = Join-Path (Split-Path -Parent $java) 'javac.exe'
    if (-not (Test-Path -LiteralPath $javac -PathType Leaf)) {
        throw 'A Java 21 JDK with javac is required.'
    }

    $driver = Get-ChildItem -Path (Join-Path $env:USERPROFILE '.m2\repository\org\postgresql\postgresql') -Recurse -Filter 'postgresql-*.jar' |
        Where-Object { $_.Name -notmatch '-(sources|javadoc)\.jar$' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($null -eq $driver) {
        throw 'The PostgreSQL JDBC driver is unavailable. Run .\mvnw.cmd -DskipTests compile first.'
    }

    $compileDirectory = Join-Path ([IO.Path]::GetTempPath()) ('valkyrias-migration-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $compileDirectory | Out-Null
    & $javac -d $compileDirectory (Join-Path $projectRoot 'scripts\tools\ApplySqlMigrations.java')
    if ($LASTEXITCODE -ne 0) { throw 'Migration helper compilation failed.' }

    $migrationPaths = @(
        $Migration | ForEach-Object { (Resolve-Path -LiteralPath $_).Path }
    )
    $classPath = "$compileDirectory;$($driver.FullName)"
    $javaArguments = @(
        '-cp'
        $classPath
        'ApplySqlMigrations'
        $env:SPRING_DATASOURCE_URL
        $env:SPRING_DATASOURCE_USERNAME
    ) + $migrationPaths

    & $java @javaArguments
    if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE." }
} finally {
    [Environment]::SetEnvironmentVariable($migrationPasswordVariable, $previousMigrationPassword, 'Process')
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($null -ne $securePassword) { $securePassword.Dispose() }
    if ($compileDirectory -and (Test-Path -LiteralPath $compileDirectory)) {
        $resolvedTemp = [IO.Path]::GetFullPath($compileDirectory)
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if ($resolvedTemp.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
        }
    }
    if ($locationWasPushed) { Pop-Location }
}
