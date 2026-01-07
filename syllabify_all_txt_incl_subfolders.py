# pip install pyphen

import pyphen
import glob
import os

# --- CONFIGURATION ---
# 1. Output folder name
OUTPUT_FOLDER = "syllabified_txt"

# 2. Language setup
dic = pyphen.Pyphen(lang='en_US')

# 3. Your character (Middle Dot)
SEPARATOR = '\u00B7'
# ---------------------

def syllabify_text(text):
    """
    Takes a word, finds hyphenation points, and replaces the hyphen 
    with the custom separator.
    """
    syllabified = dic.inserted(text)
    return syllabified.replace('-', SEPARATOR)

def process_files():
    # Get the directory where this script is running
    base_dir = os.getcwd()
    
    # Find all .txt files recursively
    files = glob.glob('**/*.txt', recursive=True)
    
    print(f"Scanning... Found {len(files)} text files.")
    
    count = 0
    
    for filepath in files:
        # Get the path relative to the script location
        # Example: "subfolder\story.txt"
        rel_path = os.path.relpath(filepath, base_dir)
        
        # SAFETY CHECK: 
        # If we run this script twice, don't process files inside the output folder
        if rel_path.startswith(OUTPUT_FOLDER):
            continue

        try:
            # 1. Read Original
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # 2. Process Content
            output_lines = []
            for line in content.splitlines():
                # Split line into words, process each, join back
                new_line = " ".join([syllabify_text(word) for word in line.split(" ")])
                output_lines.append(new_line)
            
            new_content = "\n".join(output_lines)
            
            # 3. Construct New Path
            # This creates: current_dir + syllabified_txt + subfolder + story.txt
            dest_path = os.path.join(base_dir, OUTPUT_FOLDER, rel_path)
            
            # 4. Create Subdirectories if they don't exist
            # e.g., creates "syllabified_txt/subfolder/"
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            # 5. Save File
            with open(dest_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            count += 1
            print(f"[OK] {rel_path} -> {os.path.join(OUTPUT_FOLDER, rel_path)}")

        except Exception as e:
            print(f"[ERROR] Could not process {filepath}: {e}")

    print(f"\nDone! Processed {count} files.")
    print(f"Check the '{OUTPUT_FOLDER}' folder.")

if __name__ == "__main__":
    process_files()
