param(
  [string]$OutDir = "docs/db",
  [switch]$PublicOnly,
  [switch]$Timestamped
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss")
$suffix = if ($Timestamped.IsPresent) { "_$ts" } else { "" }

$schemaFile = if ($PublicOnly.IsPresent) { Join-Path $OutDir ("schema_public$suffix.sql") } else { Join-Path $OutDir ("schema_all$suffix.sql") }
$metaFile   = if ($PublicOnly.IsPresent) { Join-Path $OutDir ("schema_public$suffix.meta.txt") } else { Join-Path $OutDir ("schema_all$suffix.meta.txt") }
$hashFile   = if ($PublicOnly.IsPresent) { Join-Path $OutDir ("schema_public$suffix.sha256.txt") } else { Join-Path $OutDir ("schema_all$suffix.sha256.txt") }

Write-Host "==> Snapshot schema remote (linked) ..."
Write-Host "OutDir: $OutDir"
Write-Host ("Mode:   " + ($(if ($PublicOnly.IsPresent) { "public only" } else { "all schemas (Supabase-managed excluded by CLI)" })))
Write-Host "File:   $schemaFile"

# NOTE: supabase db dump is schema-only by default; data requires --data-only
if ($PublicOnly.IsPresent) {
  supabase db dump --linked --schema public -f $schemaFile
} else {
  supabase db dump --linked -f $schemaFile
}

if (-not (Test-Path $schemaFile)) {
  throw "Dump non créé: $schemaFile (échec supabase db dump). Vérifie 'supabase --version', le link, et relance avec --debug."
}

$linkedRefPath = ".\supabase\.temp\project-ref"
$linkedRef = if (Test-Path $linkedRefPath) { (Get-Content -Raw $linkedRefPath).Trim() } else { "<unknown>" }

$meta = @()
$meta += "snapshot_utc=$ts"
$meta += "linked_project_ref=$linkedRef"
$meta += "public_only=$($PublicOnly.IsPresent)"
$meta += "schema_file=$(Split-Path -Leaf $schemaFile)"
$metaText = ($meta -join "`r`n") + "`r`n"
Write-Utf8NoBom -Path $metaFile -Content $metaText

$hash = (Get-FileHash -Algorithm SHA256 $schemaFile).Hash.ToLower()
Write-Utf8NoBom -Path $hashFile -Content ($hash + "  " + (Split-Path -Leaf $schemaFile) + "`r`n")

Write-Host "==> OK"
Write-Host "Meta: $metaFile"
Write-Host "Hash: $hashFile"