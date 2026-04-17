import sys

def analyze_css(filepath):
    try:
        with open(filepath, 'rb') as f:
            content = f.read()
            
        print(f"Total bytes: {len(content)}")
        
        null_count = content.count(b'\x00')
        print(f"Null bytes found: {null_count}")
        
        # Check first 1000 bytes for UTF-16 markers or other issues
        print(f"BOM check: {content[:4]}")
        
        # Try to find '.product-card .actions' with various encodings or ignoring nulls
        clean_content = content.replace(b'\x00', b'')
        if b'.product-card .actions' in clean_content:
            idx = clean_content.find(b'.product-card .actions')
            print(f"Found '.product-card .actions' at cleaned index {idx}")
            # Show context
            context = clean_content[max(0, idx-100):min(len(clean_content), idx+100)]
            print(f"Context: {context.decode('utf-8', errors='ignore')}")
        else:
            print("String not found even in cleaned content.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_css('d:/shopthoitrang/style.css')
