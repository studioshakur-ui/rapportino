# tools/supabase/Refresh-DocsDbSnapshot.ps1
# Regenerates docs/db/schema_snapshot.sql from the LINKED remote database using:
#   supabase db dump --linked --schema public -f <file>
# This is a documentation snapshot (not migrations).
#
# Requires: supabase link already correct (use Assert-ProjectLink.ps1 -Fix)

[CmdletBinding()]
param(
  [string]$OutFile = "docs/db/schema_snapshot.sql",
  [string]$Schema = "public",
  [string]$EnvKey = "VITE_SUPABASE_URL",
  [switch]$AutoLink
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FrontendProjectRef {
  $envFiles = Get-ChildItem -Force -File .env* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
  foreach ($f in $envFiles) {
    $m = Select-String -Path $f -Pattern "^\s*$EnvKey\s*=\s*(.+)\s*$" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) {
      $line = $m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
      $refMatch = [regex]::Match($line, "https://([a-z0-9]+)\.supabase\.co", "IgnoreCase")
      if ($refMatch.Success) { return $refMatch.Groups[1].Value.ToLowerInvariant() }
    }
  }
  return $null
}

function Ensure-Link {
  if (-not $AutoLink) { return }
  $ref = Get-FrontendProjectRef
  if (-not $ref) { return }
  Write-Host "AutoLink: supabase link --project-ref $ref"
  supabase link --project-ref $ref
}

# Ensure output folder
$dir = Split-Path -Parent $OutFile
if ($dir -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Force $dir | Out-Null
}

Ensure-Link

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("schema_snapshot_{0}.sql" -f ([System.Guid]::NewGuid().ToString("N")))

Write-Host "Dumping remote schema -> $tmp"
supabase db dump --linked --schema $Schema -f $tmp

# Normalize encoding: ensure UTF-8 without BOM (Windows safe)
$bytes = [System.IO.File]::ReadAllBytes($tmp)
# UTF-8 BOM = EF BB BF
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
  $bytes = $bytes[3..($bytes.Length - 1)]
}
[System.IO.File]::WriteAllBytes($OutFile, $bytes)

Remove-Item -Force $tmp -ErrorAction SilentlyContinue

Write-Host "OK: snapshot écrit dans $OutFile"

# Quick sanity check: ships exists in snapshot?
$txt = Get-Content -Raw $OutFile
if ($txt -match "(?is)\bcreate\s+table\s+$Schema\.ships\b") {
  Write-Host "Sanity: OK - '$Schema.ships' trouvé dans le snapshot."
} else {
  Write-Warning "Sanity: '$Schema.ships' non trouvé dans le snapshot. Si tu attends ships, vérifie que tu dump le bon schéma et surtout le bon projet linké."
}