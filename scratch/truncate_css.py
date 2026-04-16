path = r'd:\shopthoitrang\style.css'

with open(path, 'rb') as f:
    data = f.read()

# Find last '}'
last_brace = data.rfind(b'}')

if last_brace != -1:
    # Cut everything after last '}'
    clean_data = data[:last_brace + 1]
    
    # Save back
    with open(path, 'wb') as f:
        f.write(clean_data)
    
    print(f"File truncated at byte {last_brace + 1}. Removed {len(data) - (last_brace + 1)} bytes.")
else:
    print("Could not find any closing brace '}'. File might be severely corrupted.")
