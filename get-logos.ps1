# Best-effort logo fetcher. Run from the project root:  powershell -ExecutionPolicy Bypass -File .\get-logos.ps1
# Saves to assets\partners\<slug>.<ext>. Skips slugs that already have a file. CHECK each result by eye afterwards.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ua = @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"; "Accept" = "text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8"; "Accept-Language" = "en-ZA,en;q=0.9" }
$dest = Join-Path $PSScriptRoot "assets\partners"; New-Item -ItemType Directory -Force $dest | Out-Null

$sites = [ordered]@{
  "mtn"             = "https://www.mtn.co.za/home/"
  "sasol"           = "https://www.sasol.com/"
  "univen"          = "https://www.univen.ac.za/"
  "usaf"            = "https://usaf.ac.za/"
  "edhe"            = "https://edhe.co.za/"
  "uj-education"    = "https://www.uj.ac.za/faculties/education/"
  "vhembe-district" = "https://vhembe.gov.za/"
  "gauteng-e-government" = "https://www.gov.za/gauteng/gauteng-e-government"
  "adopt-a-school"  = "https://www.adoptaschool.org.za/"
  "icatalysis-hub"  = "https://za.linkedin.com/company/icatalysis-hub"
}
# Known direct URLs win over scraping
$direct = @{ "sasol" = "https://www.sasol.com/sites/default/files/sasol-new-logo_0.png"; "uj-education" = "https://www.uj.ac.za/wp-content/uploads/2026/03/uj_logo.jpg" }

function Save-Logo($slug, $url) {
  $tmp = Join-Path $env:TEMP ("logo_" + [guid]::NewGuid().ToString("N"))
  try {
    Invoke-WebRequest -Uri $url -Headers ($ua + @{ "Referer" = ([Uri]$url).GetLeftPart("Authority") + "/" }) -OutFile $tmp -UseBasicParsing -TimeoutSec 30
    $b = [IO.File]::ReadAllBytes($tmp); if ($b.Length -lt 100) { throw "file too small" }
    $head = [Text.Encoding]::ASCII.GetString($b[0..([Math]::Min(255,$b.Length-1))])
    if     ($b[0] -eq 0x89 -and $b[1] -eq 0x50) { $ext = ".png" }
    elseif ($b[0] -eq 0xFF -and $b[1] -eq 0xD8) { $ext = ".jpg" }
    elseif ($head.StartsWith("GIF8"))           { $ext = ".gif" }
    elseif ($head.StartsWith("RIFF") -and $head.Contains("WEBP")) { $ext = ".webp" }
    elseif ($head -match "<svg" -or ($head -match "<\?xml" -and ([Text.Encoding]::UTF8.GetString($b) -match "<svg"))) { $ext = ".svg" }
    else { throw "not a usable image (maybe .ico or an HTML page)" }
    Move-Item -Force $tmp (Join-Path $dest "$slug$ext")
    Write-Host "  saved $slug$ext  <- $url" -ForegroundColor Green; return $true
  } catch { Write-Host "  failed $url : $($_.Exception.Message)" -ForegroundColor Yellow; return $false }
  finally { if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue } }
}

foreach ($slug in $sites.Keys) {
  if (Get-ChildItem $dest -Filter "$slug.*" -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in ".svg",".png",".webp",".jpg" }) { Write-Host "${slug}: already present, skipping"; continue }
  Write-Host "$slug"
  if ($direct.ContainsKey($slug) -and (Save-Logo $slug $direct[$slug])) { continue }
  $base = [Uri]$sites[$slug]
  try { $html = (Invoke-WebRequest -Uri $base -Headers ($ua + @{ "Referer" = "https://www.google.com/" }) -UseBasicParsing -TimeoutSec 30).Content } catch { Write-Host "  could not load page: $($_.Exception.Message) - open the site in your browser, right-click the logo > Save image as > assets\partners\$slug.png" -ForegroundColor Yellow; continue }
  $cands = @()
  # <img ... logo ...> first (most likely the header logo), then og:image, then touch icons
  $cands += [regex]::Matches($html, '<img[^>]+src=["'']([^"'']*logo[^"'']*)["'']', "IgnoreCase") | ForEach-Object { $_.Groups[1].Value }
  $cands += [regex]::Matches($html, '<meta[^>]+property=["'']og:image["''][^>]+content=["'']([^"'']+)["'']', "IgnoreCase") | ForEach-Object { $_.Groups[1].Value }
  $cands += [regex]::Matches($html, '<link[^>]+rel=["''](?:apple-touch-icon|icon|shortcut icon)["''][^>]+href=["'']([^"'']+)["'']', "IgnoreCase") | ForEach-Object { $_.Groups[1].Value }
  $done = $false
  foreach ($c in ($cands | Select-Object -Unique)) {
    if ($c -like "data:*") { continue }
    $abs = (New-Object Uri($base, $c)).AbsoluteUri
    if (Save-Logo $slug $abs) { $done = $true; break }
  }
  if (-not $done) { Write-Host "  no logo found - download manually as assets\partners\$slug.svg/.png" -ForegroundColor Red }
}
$missing = $sites.Keys | Where-Object { $slug = $_; -not (Get-ChildItem $dest -Filter "$slug.*" -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in ".svg",".png",".webp",".jpg" }) }
if ($missing) { Write-Host "`nStill missing - save manually into assets\partners\ : $($missing -join ', ')" -ForegroundColor Yellow } else { Write-Host "`nAll logos present." -ForegroundColor Green }