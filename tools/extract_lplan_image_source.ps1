param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot ".tmp\lplan-image-source"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $ZipPath))
try {
  $entries = $archive.Entries | Where-Object {
    $_.FullName -match '(^|[\\/])product-images[^\\/]*\.js$' -or
    $_.FullName -match '(^|[\\/])assets[\\/]product-images[\\/].*\.(jpg|jpeg|png|webp)$'
  }
  foreach ($entry in $entries) {
    if (-not $entry.Name) { continue }
    $relativePath = $entry.FullName -replace '/', '\'
    $destination = Join-Path $outputRoot $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
  }
  Write-Host "Extracted $($entries.Count) LPLAN image resources to $outputRoot"
}
finally {
  $archive.Dispose()
}
