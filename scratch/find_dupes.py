import collections

path = r'd:\shopthoitrang\style.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

line_counts = collections.Counter(lines)
for line, count in line_counts.items():
    if count > 2 and len(line.strip()) > 30:
        print(f"Duplicated {count} times: {line.strip()[:60]}...")
