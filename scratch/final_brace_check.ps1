$path = "d:\shopthoitrang\style.css"
$content = [System.IO.File]::ReadAllText($path)

$open = ($content.ToCharArray() | Where-Object {$_ -eq '{'}).Count
$close = ($content.ToCharArray() | Where-Object {$_ -eq '}'}).Count

Write-Host "Open braces: $open"
Write-Host "Close braces: $close"
Write-Host "Difference: $($open - $close)"
