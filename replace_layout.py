import sys

blade_file = r'c:\laragon\www\n8n projects\video ads project\vidsAi\resources\views\projects\subtitle-styles.blade.php'
new_html_file = r'c:\laragon\www\n8n projects\video ads project\vidsAi\new_html.txt'

with open(new_html_file, 'r', encoding='utf-8') as f:
    new_html = f.read()

with open(blade_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "@section('content')" in line:
        start_idx = i + 1
    if "<!-- Loading Overlay -->" in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx] + [new_html + '\n\n'] + lines[end_idx:]
    with open(blade_file, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully replaced layout block safely.")
else:
    print(f"Error: Could not find markers. Start: {start_idx}, End: {end_idx}")
