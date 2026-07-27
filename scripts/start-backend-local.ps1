[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$expectedJavaHome = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'

function Test-ProhibitedPasswordCharacter {
    param([Parameter(Mandatory)][string]$Value)

    foreach ($character in $Value.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)
        if ([char]::IsControl($character) -or
            $category -eq [Globalization.UnicodeCategory]::Format -or
            $category -eq [Globalization.UnicodeCategory]::OtherNotAssigned) {
            return $true
        }
    }

    return $false
}

function Import-BackendSettingsFromEnvFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    # Import only the allowlisted backend settings. Never import a stored
    # SPRING_DATASOURCE_PASSWORD; the value entered below must be authoritative.
    $allowedNames = @(
        'SUPABASE_URL',
        'SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_PROFILE_BUCKET',
        'SUPABASE_ORDER_FILES_BUCKET',
        'PROFILE_AVATAR_MAX_BYTES',
        'ORDER_FILE_MAX_BYTES',
        'SUPABASE_SIGNED_URL_TTL_SECONDS',
        'SPRING_DATASOURCE_URL',
        'SPRING_DATASOURCE_USERNAME',
        'SPRING_JPA_HIBERNATE_DDL_AUTO',
        'SPRING_JPA_SHOW_SQL',
        'SPRING_H2_CONSOLE_ENABLED',
        'SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE',
        'SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE',
        'APP_ALLOWED_ORIGINS',
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET'
    )

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $name = $matches[1]
            if ($allowedNames -contains $name) {
                $value = $matches[2].Trim()
                if ($value.Length -ge 2 -and
                    (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                     ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                [Environment]::SetEnvironmentVariable($name, $value, [EnvironmentVariableTarget]::Process)
                if ($name -eq 'SUPABASE_SERVICE_ROLE_KEY') {
                    $script:serviceRoleEnvironmentWasSet = $true
                }
            }
        }
    }
}

$passwordEnvironmentWasSet = $false
$serviceRoleEnvironmentWasSet = $false
$mavenExitCode = 1
$securePassword = $null
$passwordPointer = [IntPtr]::Zero

try {
    $envFile = Join-Path $projectRoot '.env.local'
    Import-BackendSettingsFromEnvFile -Path $envFile

    if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_URL)) {
        $env:SPRING_DATASOURCE_URL = Read-Host 'Supabase PostgreSQL JDBC URL'
    }
    if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_USERNAME)) {
        $env:SPRING_DATASOURCE_USERNAME = Read-Host 'Supabase PostgreSQL username'
    }
    $datasourceUrl = $env:SPRING_DATASOURCE_URL
    $datasourceUsername = $env:SPRING_DATASOURCE_USERNAME

    # The existing frontend .env.local uses VITE_* names. Reuse those public
    # project values for the backend's Supabase Auth user endpoint; the
    # publishable key is never treated as a JWT signing secret.
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -and
        -not [string]::IsNullOrWhiteSpace($env:VITE_SUPABASE_URL)) {
        $env:SUPABASE_URL = $env:VITE_SUPABASE_URL
    }
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_PUBLISHABLE_KEY) -and
        -not [string]::IsNullOrWhiteSpace($env:VITE_SUPABASE_PUBLISHABLE_KEY)) {
        $env:SUPABASE_PUBLISHABLE_KEY = $env:VITE_SUPABASE_PUBLISHABLE_KEY
    }

    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL)) {
        throw 'SUPABASE_URL is required for backend Supabase authentication.'
    }
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_PUBLISHABLE_KEY)) {
        throw 'SUPABASE_PUBLISHABLE_KEY is required for backend Supabase authentication.'
    }

    if (Test-Path -LiteralPath $expectedJavaHome -PathType Container) {
        $env:JAVA_HOME = $expectedJavaHome
    }

    if ([string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        throw "Java 21 is required. Install Java 21 or set JAVA_HOME to a Java 21 JDK before running this script."
    }

    $javaExecutable = Join-Path $env:JAVA_HOME 'bin\java.exe'
    if (-not (Test-Path -LiteralPath $javaExecutable -PathType Leaf)) {
        throw "JAVA_HOME does not contain a Java executable: $env:JAVA_HOME"
    }

    $javaVersion = (cmd.exe /d /c "`"$javaExecutable`" -version 2>&1" | Out-String)
    if ($javaVersion -notmatch '(?m)version\s+"21(?:[.\"]|-)') {
        throw "Java 21 is required. The configured JAVA_HOME is not Java 21: $env:JAVA_HOME"
    }

    Write-Host "Using Java 21 from $env:JAVA_HOME"
    Write-Host 'Datasource URL and username loaded from the local environment.'

    $securePassword = Read-Host -Prompt 'Enter the Supabase database password (input is hidden)' -AsSecureString
    if ($null -eq $securePassword -or $securePassword.Length -eq 0) {
        throw 'The database password cannot be empty.'
    }

    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    if ([string]::IsNullOrEmpty($plainPassword)) {
        throw 'The database password cannot be empty.'
    }
    if ($plainPassword -ne $plainPassword.Trim()) {
        throw 'The database password must not start or end with whitespace.'
    }
    if (Test-ProhibitedPasswordCharacter -Value $plainPassword) {
        throw 'The database password contains a hidden or non-printable character.'
    }

    # This is process-scoped and is removed in the finally block below.
    [Environment]::SetEnvironmentVariable(
        'SPRING_DATASOURCE_URL',
        $datasourceUrl,
        [EnvironmentVariableTarget]::Process
    )
    [Environment]::SetEnvironmentVariable(
        'SPRING_DATASOURCE_USERNAME',
        $datasourceUsername,
        [EnvironmentVariableTarget]::Process
    )
    [Environment]::SetEnvironmentVariable(
        'SPRING_DATASOURCE_PASSWORD',
        $plainPassword,
        [EnvironmentVariableTarget]::Process
    )
    $passwordEnvironmentWasSet = $true
    $plainPassword = $null
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($null -ne $securePassword) {
        $securePassword.Dispose()
    }
}

try {
    Push-Location $projectRoot
    & (Join-Path $projectRoot 'mvnw.cmd') spring-boot:run
    $mavenExitCode = $LASTEXITCODE
} finally {
    if ($passwordEnvironmentWasSet) {
        Remove-Item -Path 'Env:SPRING_DATASOURCE_PASSWORD' -ErrorAction SilentlyContinue
    }
    if ($serviceRoleEnvironmentWasSet) {
        Remove-Item -Path 'Env:SUPABASE_SERVICE_ROLE_KEY' -ErrorAction SilentlyContinue
    }
    Pop-Location
}

exit $mavenExitCode
