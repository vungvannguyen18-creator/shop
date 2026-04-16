import os

file_path = r'd:\shopthoitrang\style.css'

with open(file_path, 'rb') as f:
    content = f.read()

print(f"Total bytes: {len(content)}")
null_count = content.count(b'\x00')
print(f"Null bytes found: {null_count}")

# Check for duplicate large blocks
try:
    text = content.decode('utf-8')
    lines = text.splitlines()
    print(f"Total lines: {len(lines)}")
except Exception as e:
    print(f"UTF-8 decode failed: {e}")
    # Try with another encoding or find where it breaks
    for i in range(0, len(content), 1024):
        try:
            content[i:i+1024].decode('utf-8')
        except:
            print(f"Corruption detected around byte {i}")
            break
