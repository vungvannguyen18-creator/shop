import os

def recover_css(filepath):
    print(f"Bắt đầu phục hồi file: {filepath}")
    try:
        # 1. Đọc file dưới dạng binary để bỏ qua mọi lỗi encoding và null bytes
        with open(filepath, 'rb') as f:
            raw_data = f.read()
        
        print(f"Kích thước file gốc: {len(raw_data)} bytes")
        
        # 2. Loại bỏ hoàn toàn Null bytes (\x00)
        clean_data = raw_data.replace(b'\x00', b'')
        print(f"Kích thước sau khi xóa Null bytes: {len(clean_data)} bytes")
        
        # 3. Chuyển sang text (UTF-8) để xử lý chuỗi "ghost"
        text = clean_data.decode('utf-8', errors='ignore')
        
        # 4. Tìm và xóa đoạn ghost code mà bạn thấy trên ảnh màn hình
        # Đoạn đó là: font-size 0.95rem; } (có thể có hoặc không có dấu hai chấm do bạn sửa tay)
        ghost_patterns = [
            'font-size 0.95rem;\n}',
            'font-size 0.95rem; }',
            'font-size: 0.95rem;\n}',
            'font-size: 0.95rem; }'
        ]
        
        found = False
        for pattern in ghost_patterns:
            if pattern in text:
                print(f"Đã tìm thấy đoạn mã lỗi: '{pattern}'. Đang xóa...")
                text = text.replace(pattern, '')
                found = True
        
        if not found:
            print("Không tìm thấy chuỗi ghost qua so khớp chính xác. Chuyển sang quét dòng...")
            lines = text.splitlines()
            new_lines = []
            skip_next = False
            for i, line in enumerate(lines):
                if '0.95rem' in line and (line.strip().startswith('font-size') or line.strip() == 'font-size'):
                    print(f"Đã xóa dòng lỗi tại dòng {i+1}: {line}")
                    # Nếu dòng tiếp theo chỉ là dấu đóng ngoặc }, xóa luôn
                    if i + 1 < len(lines) and lines[i+1].strip() == '}':
                        skip_next = True
                    continue
                if skip_next:
                    skip_next = False
                    continue
                new_lines.append(line)
            text = '\n'.join(new_lines)

        # 5. Ghi đè lại file với nội dung sạch
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
            
        print("Phục hồi hoàn tất. File đã sạch và chuẩn UTF-8.")
        
    except Exception as e:
        print(f"Lỗi trong quá trình phục hồi: {e}")

if __name__ == "__main__":
    filepath = "d:/shopthoitrang/style.css"
    recover_css(filepath)
