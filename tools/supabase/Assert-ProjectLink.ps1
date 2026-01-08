# tools/supabase/Assert-ProjectLink.ps1
# Verifies that the Supabase CLI is linked to the same project as the Frontend (VITE_SUPABASE_URL).
# Optionally fixes by running: supabase link --project-ref <ref>

[CmdletBinding()]
param(
  [switch]$Fix,
  [string]$EnvKey = "VITE_SUPABASE_URL"
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
  throw "Impossible de trouver $EnvKey dans tes fichiers .env* (ex: .env.local)."
}

function Get-LinkedProjectRef {
  $candidates = @(
    "supabase/.temp/project-ref",
    ".supabase/.temp/project-ref"
  )

  foreach ($p in $candidates) {
    if (Test-Path $p) {
      $v = (Get-Content -Raw $p).Trim()
      if ($v) { return $v.ToLowerInvariant() }
    }
  }

  return $null
}

$frontRef = Get-FrontendProjectRef
$linkedRef = Get-LinkedProjectRef

Write-Host "Frontend project ref (depuis $EnvKey): $frontRef"

if ($linkedRef) {
  Write-Host "CLI linked project ref (depuis supabase/.temp/project-ref): $linkedRef"
} else {
  Write-Host "CLI linked project ref: introuvable (pas de supabase/.temp/project-ref)."
  Write-Host "=> Si ton repo n'a jamais été initialisé, lance: supabase init"
}

if ($linkedRef -and ($linkedRef -ne $frontRef)) {
  Write-Warning "Mismatch: le front pointe sur $frontRef mais la CLI est linkée sur $linkedRef."
  if ($Fix) {
    Write-Host "Fix: supabase link --project-ref $frontRef"
    supabase link --project-ref $frontRef
    Write-Host "OK. Relance maintenant ta commande (db push / db dump)."
  } else {
    Write-Host "Pour corriger automatiquement:  .\tools\supabase\Assert-ProjectLink.ps1 -Fix"
  }
} elseif (-not $linkedRef) {
  Write-Host "Pour linker la CLI sur le projet du front:"
  Write-Host "  supabase link --project-ref $frontRef"
} else {
  Write-Host "OK: la CLI et le front pointent sur le même projet."
}