$path = "d:\shopthoitrang\style.css"
$bytes = [System.IO.File]::ReadAllBytes($path)
$cleanBytes = $bytes | Where-Object { $_ -ne 0 }
[System.IO.File]::WriteAllBytes($path, $cleanBytes)
Write-Host "Xóa thành công Null bytes. Tổng dung lượng mới: $($cleanBytes.Count) bytes."
