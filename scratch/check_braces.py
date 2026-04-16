path = r'd:\shopthoitrang\style.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = content.count('{')
close_braces = content.count('}')

print(f"Open braces: {open_braces}")
print(f"Close braces: {close_braces}")
print(f"Difference: {open_braces - close_braces}")

if open_braces != close_braces:
    print("Warning: Unbalanced braces detected!")

# Check for duplicate shimmer
import re
shimmers = re.findall(r'@keyframes\s+shimmer', content)
print(f"Found {len(shimmers)} occurrences of @keyframes shimmer")
