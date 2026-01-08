# tools/supabase/Bootstrap-RemoteSchemaToMigrations.ps1
# Bootstrap: pulls remote schema into supabase/migrations as a baseline migration:
#   supabase db pull <name> --linked --schema public

[CmdletBinding()]
param(
  [string]$Name = "remote_schema_baseline",
  [string]$Schema = "public",
  [string]$EnvKey = "VITE_SUPABASE_URL",
  [switch]$AutoInit,
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

if ($AutoInit -and -not (Test-Path "supabase/config.toml") -and -not (Test-Path ".supabase/config.toml")) {
  Write-Host "AutoInit: supabase init"
  supabase init
}

if ($AutoLink) {
  $ref = Get-FrontendProjectRef
  if ($ref) {
    Write-Host "AutoLink: supabase link --project-ref $ref"
    supabase link --project-ref $ref
  }
}

Write-Host "Pulling remote schema into supabase/migrations (schema=$Schema, name=$Name)"
supabase db pull $Name --linked --schema $Schema

Write-Host "OK: regarde le nouveau fichier créé dans supabase/migrations (timestamp_*_${Name}.sql)"
Write-Host "Ensuite: commit Git, puis utilise db push uniquement via migrations."