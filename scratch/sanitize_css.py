import os

file_path = r'd:\shopthoitrang\style.css'
backup_path = r'd:\shopthoitrang\style.css.bak'

def sanitize():
    print(f"Reading {file_path}...")
    with open(file_path, 'rb') as f:
        data = f.read()
    
    # Create backup
    with open(backup_path, 'wb') as f:
        f.write(data)
    print(f"Backup created at {backup_path}")

    # Remove null bytes
    sanitized_data = data.replace(b'\x00', b'')
    
    try:
        # Try to decode as utf-8, ignoring errors to get clean text
        text = sanitized_data.decode('utf-8', errors='ignore')
        
        # Split into lines and remove empty lines at the very end
        lines = text.splitlines()
        
        # Write back as clean UTF-8
        with open(file_path, 'w', encoding='utf-8') as f:
            for line in lines:
                f.write(line + '\n')
        
        print(f"Successfully sanitized. New line count: {len(lines)}")
    except Exception as e:
        print(f"Error during sanitization: {e}")

if __name__ == "__main__":
    sanitize()
