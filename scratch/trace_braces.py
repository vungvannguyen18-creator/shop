path = r'd:\shopthoitrang\style.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    opens = line.count('{')
    closes = line.count('}')
    balance += opens - closes
    if balance < 0:
        print(f"Error: Negative balance at line {i+1}: {line.strip()}")
        # balance = 0 # Reset to keep searching

print(f"Final balance: {balance}")

if balance != 0:
    print(f"File is unbalanced by {balance} braces.")
