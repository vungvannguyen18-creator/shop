import re

def fix_css_corruption(filepath):
    try:
        # Read as binary to handle any null bytes or weird characters
        with open(filepath, 'rb') as f:
            raw_content = f.read()
            
        # Strip all NULL bytes
        clean_bytes = raw_content.replace(b'\x00', b'')
        
        # Convert to string for regex work
        text = clean_bytes.decode('utf-8', errors='ignore')
        
        # Specifically target the dangling ghost code shown in the user's screenshot
        # It looks like:
        # }
        # font-size 0.95rem;
        # }
        # Or variations with spaces/newlines
        ghost_pattern = r'}\s*font-size\s+0\.95rem;\s*}\s*'
        
        if re.search(ghost_pattern, text):
            print("Found ghost code pattern. Removing...")
            text = re.sub(ghost_pattern, '}\n\n', text)
        else:
            print("Ghost pattern not found via regex. Checking for literal line...")
            # Try a broader search
            lines = text.splitlines()
            new_lines = []
            skip_next = False
            for i, line in enumerate(lines):
                if 'font-size 0.95rem;' in line:
                    print(f"Found forbidden line at {i}: {line}")
                    # Remove this line and the next line if it's just a brace
                    if i + 1 < len(lines) and lines[i+1].strip() == '}':
                        skip_next = True
                    continue
                if skip_next:
                    skip_next = False
                    continue
                new_lines.append(line)
            text = '\n'.join(new_lines)

        # Write back a clean UTF-8 string
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print("CSS file has been sanitized and rewritten.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_css_corruption('d:/shopthoitrang/style.css')
