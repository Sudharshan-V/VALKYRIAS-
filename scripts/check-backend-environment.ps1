[CmdletBinding()]
param()

$ErrorActionPreference = 'SilentlyContinue'

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

$javaHome = if ([string]::IsNullOrWhiteSpace($env:JAVA_HOME)) { '<unset>' } else { $env:JAVA_HOME }
$javaExecutable = if ($javaHome -ne '<unset>') {
    Join-Path $javaHome 'bin\java.exe'
} else {
    (Get-Command java -ErrorAction SilentlyContinue).Source
}
$javaVersion = '<unavailable>'
if ($javaExecutable -and (Test-Path -LiteralPath $javaExecutable -PathType Leaf)) {
    $javaVersion = (cmd.exe /d /c "`"$javaExecutable`" -version 2>&1" | Select-Object -First 1).ToString().Trim()
}

$datasourceHost = '<unset>'
$datasourcePort = '<unset>'
$databaseName = '<unset>'
if (-not [string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_URL)) {
    try {
        $jdbcUri = [Uri]($env:SPRING_DATASOURCE_URL -replace '^jdbc:', '')
        $datasourceHost = $jdbcUri.Host
        $datasourcePort = $jdbcUri.Port
        $databaseName = $jdbcUri.AbsolutePath.Trim('/')
    } catch {
        $datasourceHost = '<invalid JDBC URL>'
        $datasourcePort = '<invalid JDBC URL>'
        $databaseName = '<invalid JDBC URL>'
    }
}

$password = $env:SPRING_DATASOURCE_PASSWORD
$passwordSet = -not [string]::IsNullOrEmpty($password)
$surroundingSpaces = $false
$nonPrintable = $false
if ($passwordSet) {
    $surroundingSpaces = $password -ne $password.Trim()
    $nonPrintable = Test-ProhibitedPasswordCharacter -Value $password
}

$portOccupied = $false
try {
    $portOccupied = @(Get-NetTCPConnection -LocalPort 8080 -State Listen).Count -gt 0
} catch {
    $portOccupied = (Test-NetConnection -ComputerName 'localhost' -Port 8080 -InformationLevel Quiet)
}

Write-Output "Java version: $javaVersion"
Write-Output "JAVA_HOME: $javaHome"
Write-Output "Datasource host: $datasourceHost"
Write-Output "Datasource port: $datasourcePort"
Write-Output "Database name: $databaseName"
Write-Output "Datasource username: $(if ([string]::IsNullOrWhiteSpace($env:SPRING_DATASOURCE_USERNAME)) { '<unset>' } else { $env:SPRING_DATASOURCE_USERNAME })"
Write-Output "Password set: $passwordSet"
Write-Output "Password length: $(if ($passwordSet) { $password.Length } else { 0 })"
Write-Output "Password has surrounding spaces: $surroundingSpaces"
Write-Output "Password has non-printable characters: $nonPrintable"
Write-Output "Port 8080 occupied: $portOccupied"
