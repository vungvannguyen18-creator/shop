$path = "d:\shopthoitrang\style.css"
$bytes = [System.IO.File]::ReadAllBytes($path)

Write-Host "File size: $($bytes.Length) bytes"

$lastBraceIndex = -1
for ($i = $bytes.Length - 1; $i -ge 0; $i--) {
    if ($bytes[$i] -eq 125) { # 125 is ASCII for '}'
        $lastBraceIndex = $i
        break
    }
}

if ($lastBraceIndex -ne -1) {
    Write-Host "Found last brace at index $lastBraceIndex. Truncating..."
    # Offset by 1 to include the brace itself
    $cleanBytes = $bytes[0..$lastBraceIndex]
    [System.IO.File]::WriteAllBytes($path, $cleanBytes)
    Write-Host "Truncation successful. New size: $($cleanBytes.Length) bytes"
} else {
    Write-Warning "Could not find a closing brace '}' in the file."
}
