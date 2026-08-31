# =============================================================================
#  Publish the coach's working copy to the parents' site.
#
#  Run it by double-clicking publish.bat in the project folder.
#
#  It refuses to publish anything it cannot parse, so a half-written or
#  corrupted export can never reach the live site.
# =============================================================================

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

Write-Host ""
Write-Host "  SMM Spartans - publish to parents" -ForegroundColor Green
Write-Host "  ---------------------------------"
Write-Host ""

# --- find the newest export --------------------------------------------------
# Chrome appends (1), (2)... rather than overwriting, so go by timestamp.
$downloads = Join-Path $env:USERPROFILE 'Downloads'
$export = Get-ChildItem -Path $downloads -Filter 'team-data*.js' -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1

if (-not $export) {
  Write-Host "  No export found in Downloads." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  On the site: Publish -> Export publish file, then run this again."
  exit 1
}

$age = [int]((Get-Date) - $export.LastWriteTime).TotalMinutes
Write-Host ("  Found: {0}" -f $export.Name)
Write-Host ("  Saved: {0}  ({1} minutes ago)" -f $export.LastWriteTime.ToString('h:mm tt'), $age)

if ($age -gt 120) {
  Write-Host ""
  Write-Host "  That export is over two hours old." -ForegroundColor Yellow
  $answer = Read-Host "  Publish it anyway? (y/n)"
  if ($answer -ne 'y') { Write-Host "  Stopped."; exit 1 }
}

# --- refuse to publish something broken --------------------------------------
$check = @"
global.window = {};
require(process.argv[1]);
var d = window.PUBLISHED_TEAM_DATA;
if (!d || !d.roster || !d.plays) throw new Error('not a team data file');
console.log(d.roster.length + ' players, ' + d.plays.length + ' plays, ' +
  (d.drills || []).length + ' drills, ' + d.practices.length + ' events');
"@
$tmp = Join-Path $env:TEMP 'ff-check.js'
Set-Content -Path $tmp -Value $check -Encoding utf8

try {
  $summary = & node -e "$check" $export.FullName 2>&1
  if ($LASTEXITCODE -ne 0) { throw $summary }
} catch {
  Write-Host ""
  Write-Host "  That file could not be read, so nothing was published." -ForegroundColor Red
  Write-Host "  $_"
  exit 1
}

Write-Host ("  Contains: {0}" -f $summary)
Write-Host ""

# --- install and push ---------------------------------------------------------
Copy-Item $export.FullName (Join-Path $project 'data\team-data.js') -Force

$changed = & git status --porcelain 'data/team-data.js'
if (-not $changed) {
  Write-Host "  Already published - nothing has changed since last time." -ForegroundColor Yellow
  exit 0
}

& git add data/team-data.js | Out-Null
& git commit -q -m "Publish: $summary" | Out-Null
& git push -q origin main

if ($LASTEXITCODE -ne 0) {
  Write-Host "  Push failed. Are you online?" -ForegroundColor Red
  exit 1
}

Write-Host "  Published." -ForegroundColor Green
Write-Host "  Parents will see it at https://smm-spartans4.github.io/ within a minute."
Write-Host ""
Write-Host "  You can delete the file in Downloads now."
