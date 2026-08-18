param(
  [Parameter(Mandatory = $true)][string]$CatalogPath,
  [Parameter(Mandatory = $true)][string]$AdminToken,
  [string]$BaseUrl = 'https://ga-pick.com'
)

$catalog = Get-Content -LiteralPath $CatalogPath -Raw | ConvertFrom-Json
$body = [ordered]@{
  sourceName = $catalog.sourceName
  sourceDate = $catalog.sourceDate
  items = $catalog.items
} | ConvertTo-Json -Depth 8 -Compress

$response = Invoke-RestMethod `
  -Uri "$($BaseUrl.TrimEnd('/'))/api/subscription-products/replace" `
  -Method Post `
  -Headers @{ 'X-Admin-Token' = $AdminToken } `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body

$response | ConvertTo-Json -Depth 5
