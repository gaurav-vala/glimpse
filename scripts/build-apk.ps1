#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Builds a release APK for Luma Gallery.

.DESCRIPTION
    Runs typecheck, regenerates the native Android project from app.json,
    assembles a release APK, and stages the result in releases/.

    Use -Install to push the APK to a connected phone with "adb install -r".
#>
[CmdletBinding()]
param(
    [ValidateSet('arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86', 'all')]
    [string]$Abi = 'arm64-v8a',

    [switch]$Install,

    [switch]$SkipChecks,

    [int]$MaxWorkers = 0,

    [switch]$NoPrebuild,

    [ValidateSet('patch', 'minor', 'major', 'none')]
    [string]$Bump = 'none'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$repoRoot    = Split-Path -Parent $PSScriptRoot
$appJsonPath = Join-Path $repoRoot 'app.json'
$androidDir  = Join-Path $repoRoot 'android'
$releaseDir  = Join-Path $repoRoot 'releases'
$builtApk    = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'

function Write-Step {
    param([string]$Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Native {
    param([string]$Command, [string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Command @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previous
    }

    if ($exitCode -ne 0) {
        throw "'$Command $($Arguments -join ' ')' failed with exit code $exitCode."
    }
}

function Resolve-AndroidSdk {
    $candidates = @()
    foreach ($root in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT)) {
        if ($root) { $candidates += $root }
    }

    $localProperties = Join-Path $androidDir 'local.properties'
    if (Test-Path $localProperties) {
        $line = Select-String -Path $localProperties -Pattern '^\s*sdk\.dir\s*=\s*(.+)$' | Select-Object -First 1
        if ($line) { $candidates += $line.Matches[0].Groups[1].Value.Trim() }
    }

    $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    $candidates += 'C:\Android\Sdk'

    foreach ($candidate in $candidates) {
        if (-not $candidate) { continue }
        if (Test-Path (Join-Path $candidate 'platform-tools\adb.exe')) { return $candidate }
        if (Test-Path (Join-Path $candidate 'platforms')) { return $candidate }
    }

    throw 'The Android SDK was not found. Set ANDROID_HOME, or install the SDK to the default location.'
}

function Initialize-AndroidSdkEnvironment {
    $sdk = Resolve-AndroidSdk
    $env:ANDROID_HOME = $sdk
    if (-not $env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT = $sdk }

    $localProperties = Join-Path $androidDir 'local.properties'
    $hasSdkDir = (Test-Path $localProperties) -and
        (Select-String -Path $localProperties -Pattern '^\s*sdk\.dir\s*=' -Quiet)

    if (-not $hasSdkDir) {
        Set-Content -Path $localProperties -Value "sdk.dir=$($sdk -replace '\\', '/')" -Encoding ASCII
    }

    return $sdk
}

function Resolve-Adb {
    $onPath = Get-Command adb -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    $candidate = Join-Path (Resolve-AndroidSdk) 'platform-tools\adb.exe'
    if (Test-Path $candidate) { return $candidate }

    throw 'adb was not found. Install Android platform-tools, or add the Android SDK to PATH.'
}

# --- Read and optionally bump the version ------------------------------------
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $appJsonPath)) { throw "app.json not found at $appJsonPath" }
$appConfig = Get-Content $appJsonPath -Raw | ConvertFrom-Json
$version = $appConfig.expo.version
$versionCode = [int]$appConfig.expo.android.versionCode

$artifact = Join-Path $releaseDir "luma-gallery-$version.apk"
Write-Step "Building Luma Gallery $version (versionCode $versionCode, $Abi)"

# --- Checks ------------------------------------------------------------------
if (-not $SkipChecks) {
    Write-Step 'Typechecking'
    Invoke-Native 'npx' @('tsc', '--noEmit')
}

# --- Build -------------------------------------------------------------------
if ($NoPrebuild) {
    if (-not (Test-Path $androidDir)) {
        throw 'android/ does not exist yet, so -NoPrebuild cannot be used. Run once without it.'
    }
    Write-Step 'Reusing the existing android/ project (prebuild skipped)'
}
else {
    Write-Step 'Regenerating the native Android project from app.json'
    Invoke-Native 'npx' @('expo', 'prebuild', '--platform', 'android')
}

Write-Step 'Locating the Android SDK'
Write-Host "     sdk.dir=$(Initialize-AndroidSdkEnvironment)"

Write-Step 'Assembling the release APK'
$gradleArgs = @('assembleRelease')
if ($Abi -ne 'all') { $gradleArgs += "-PreactNativeArchitectures=$Abi" }
if ($MaxWorkers -gt 0) { $gradleArgs += "--max-workers=$MaxWorkers" }

Push-Location $androidDir
try {
    Invoke-Native '.\gradlew.bat' $gradleArgs
}
finally {
    Pop-Location
}

if (-not (Test-Path $builtApk)) {
    throw "Gradle reported success but $builtApk does not exist."
}

# --- Stage the artifact ------------------------------------------------------
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
Copy-Item $builtApk $artifact -Force
$sizeMb = [math]::Round((Get-Item $artifact).Length / 1MB, 1)

# --- Install -----------------------------------------------------------------
if ($Install) {
    Write-Step 'Installing to the connected device'
    $adb = Resolve-Adb
    Invoke-Native $adb @('install', '-r', $artifact)
}

Write-Host ''
Write-Host "APK ready: $artifact ($sizeMb MB)" -ForegroundColor Green
