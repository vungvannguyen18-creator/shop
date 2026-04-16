$path = "d:\shopthoitrang\style.css"
$backup = "d:\shopthoitrang\style.css.bak2"

Write-Host "Cleaning $path ..."

# Read raw bytes
$bytes = [System.IO.File]::ReadAllBytes($path)

# Filter out null bytes (0)
$cleanBytes = $bytes | Where-Object { $_ -ne 0 }

# Write clean bytes to a temporary clean file
[System.IO.File]::WriteAllBytes($backup, $cleanBytes)

# Read it back as a string to find duplicates and fix braces
$content = [System.IO.File]::ReadAllText($backup)

# Check for the last closing brace
if (-not $content.TrimEnd().EndsWith("}")) {
    Write-Host "Missing closing brace detected. Adding it."
    $content += "`n}"
}

# Write back as UTF8
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)

Write-Host "Sanitization complete."
