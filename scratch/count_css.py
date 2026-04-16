import os

file_path = r'd:\shopthoitrang\style.css'
out_path = r'd:\shopthoitrang\scratch\count_results.txt'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(out_path, 'w', encoding='utf-8') as f_out:
        f_out.write(f"Total lines: {len(lines)}\n")
        f_out.write(f"Last 5 lines:\n")
        for i in range(max(0, len(lines)-5), len(lines)):
            f_out.write(f"{i+1}: {lines[i]}\n")

except Exception as e:
    with open(out_path, 'w', encoding='utf-8') as f_out:
        f_out.write(f"Error: {str(e)}\n")
