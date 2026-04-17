$path = "d:\shopthoitrang\style.css"
$bytes = [System.IO.File]::ReadAllBytes($path)
$cleanBytes = $bytes | Where-Object { $_ -ne 0 }
$content = [System.Text.Encoding]::UTF8.GetString($cleanBytes)

# Xoa doan ma ghost shown in screenshot
# font-size 0.95rem; }
# Match various patterns: with/without colon, with/without newline
$pattern1 = 'font-size\s*:?\s*0\.95rem;\s*}'
$newContent = $content -replace $pattern1, ''

# Match the literal dangling brace at line 530 if still there
$pattern2 = '(?m)^\s*}\s*$'
# Note: be careful here, only remove if it's right after the ghost code. 
# Better: just remove the specific block pattern.

# Viet lai file
[System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Phuc hoi CSS thanh cong. Da xoa ma loi."
