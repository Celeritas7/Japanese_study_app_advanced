#!/usr/bin/env python3
"""
JLPT Kanji Data Parser
======================
Parses:
1. Kanji_Story_database_R002.xlsm → story CSVs
2. kanjidic2.xml → similar kanji groups CSV

Output files:
- japanese_kanji_story_groups.csv
- japanese_kanji_stories.csv
- japanese_kanji_similar_groups.csv

Usage:
1. Place this script in the same folder as:
   - Kanji_Story_database_R002.xlsm
   - kanjidic2.xml
   
2. Install dependencies:
   pip install pandas openpyxl lxml

3. Run:
   python kanji_parser.py
"""

import pandas as pd
import xml.etree.ElementTree as ET
from collections import defaultdict
import csv
import os
import re

# ============================================
# CONFIGURATION
# ============================================
EXCEL_FILE = "Kanji_Story_database_R002.xlsm"
KANJIDIC_FILE = "kanjidic2.xml"
JMDICT_FILE = "JMdict_e.xml"  # Optional

OUTPUT_DIR = "output_csv"

# ============================================
# HELPER FUNCTIONS
# ============================================
def clean_text(text):
    """Clean and normalize text"""
    if pd.isna(text) or text is None:
        return ""
    return str(text).strip()

def extract_frame_number(story_text):
    """Extract frame number like [8] from story text"""
    if not story_text:
        return ""
    match = re.search(r'\[(\d+)\]', story_text)
    return match.group(1) if match else ""

def is_kanji(char):
    """Check if character is a kanji"""
    if not char:
        return False
    code = ord(char[0])
    return (0x4E00 <= code <= 0x9FFF or  # CJK Unified Ideographs
            0x3400 <= code <= 0x4DBF or  # CJK Extension A
            0x20000 <= code <= 0x2A6DF)  # CJK Extension B

# ============================================
# PART 1: PARSE EXCEL STORY DATABASE
# ============================================
def parse_excel_stories(excel_path):
    """
    Parse the Story_all sheet from Excel file
    
    Column mapping (based on analysis):
    - Col 2: Group number
    - Col 3: Group kanji
    - Col 4: Member number within group
    - Col 5: Member kanji (if different from group)
    - Col 13: Display kanji
    - Col 14: Meaning
    - Col 15: Story text
    - Col 17: On'yomi
    """
    print(f"\n📖 Parsing Excel file: {excel_path}")
    
    try:
        df = pd.read_excel(excel_path, sheet_name='Story_all', header=None)
        print(f"   Loaded {len(df)} rows")
    except Exception as e:
        print(f"   ❌ Error loading Excel: {e}")
        return [], []
    
    groups = {}  # group_kanji -> group data
    stories = []  # individual kanji stories
    
    for idx, row in df.iterrows():
        # Skip header/empty rows
        if pd.isna(row[3]) or str(row[3]).strip() == '' or str(row[3]) == 'Kanji_sequence':
            continue
        
        group_num = row[2] if not pd.isna(row[2]) else None
        group_kanji = clean_text(row[3])
        member_num = row[4] if not pd.isna(row[4]) else 1
        member_kanji = clean_text(row[5]) if not pd.isna(row[5]) else ""
        display_kanji = clean_text(row[13])
        meaning = clean_text(row[14])
        story = clean_text(row[15])
        onyomi = clean_text(row[17])
        
        # Determine the actual kanji for this entry
        actual_kanji = display_kanji or member_kanji or group_kanji
        
        if not actual_kanji or not is_kanji(actual_kanji[0]):
            continue
        
        # Extract frame number from story
        frame_num = extract_frame_number(story)
        
        # If this is the first entry for this group (member_num == 1), save as group
        if member_num == 1 or group_kanji not in groups:
            groups[group_kanji] = {
                'group_number': group_num,
                'group_kanji': group_kanji,
                'group_meaning': meaning,
                'group_story': story,
                'onyomi': onyomi
            }
        
        # Add individual story entry
        stories.append({
            'group_kanji': group_kanji,
            'member_number': member_num,
            'kanji': actual_kanji,
            'meaning': meaning,
            'story': story,
            'frame_number': frame_num,
            'onyomi': onyomi
        })
    
    # Handle duplicate kanji by adding suffixes ①②③...
    stories = add_duplicate_suffixes(stories)
    
    print(f"   ✅ Found {len(groups)} groups, {len(stories)} stories")
    return list(groups.values()), stories


def add_duplicate_suffixes(stories):
    """
    Add suffixes ①②③... to duplicate kanji entries.
    First occurrence keeps original, subsequent get ①②③...
    """
    # Japanese circled numbers
    circled_numbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
                       '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']
    
    # Count occurrences of each kanji
    kanji_count = {}
    for story in stories:
        kanji = story['kanji']
        if kanji not in kanji_count:
            kanji_count[kanji] = 0
        kanji_count[kanji] += 1
    
    # Find kanji with duplicates
    duplicates = {k: v for k, v in kanji_count.items() if v > 1}
    print(f"   ℹ️ Found {len(duplicates)} kanji with multiple entries")
    
    # Track current index for each duplicate kanji
    kanji_index = {k: 0 for k in duplicates}
    
    # Add suffixes
    result = []
    for story in stories:
        kanji = story['kanji']
        
        if kanji in duplicates:
            idx = kanji_index[kanji]
            if idx < len(circled_numbers):
                suffix = circled_numbers[idx]
            else:
                suffix = f"({idx + 1})"  # Fallback for >20 duplicates
            
            # Create new entry with suffixed kanji
            new_story = story.copy()
            new_story['kanji'] = kanji + suffix
            new_story['original_kanji'] = kanji  # Keep original for reference
            result.append(new_story)
            
            kanji_index[kanji] += 1
        else:
            story['original_kanji'] = story['kanji']  # Same as kanji
            result.append(story)
    
    return result

# ============================================
# PART 2: PARSE KANJIDIC2 XML
# ============================================
def parse_kanjidic2(xml_path):
    """
    Parse KANJIDIC2 XML file for:
    - Radical information
    - On'yomi readings
    - Kun'yomi readings
    - Stroke count
    """
    print(f"\n📚 Parsing KANJIDIC2: {xml_path}")
    
    if not os.path.exists(xml_path):
        print(f"   ⚠️ File not found: {xml_path}")
        print("   Skipping KANJIDIC2 parsing...")
        return {}
    
    kanji_data = {}
    
    try:
        # Parse XML (this may take a moment for large files)
        print("   Loading XML (this may take a moment)...")
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        for character in root.findall('character'):
            literal = character.find('literal')
            if literal is None:
                continue
            
            kanji = literal.text
            
            # Get radical
            radical = ""
            rad_elem = character.find('.//rad_value[@rad_type="classical"]')
            if rad_elem is not None:
                radical = rad_elem.text
            
            # Get readings
            onyomi_list = []
            kunyomi_list = []
            
            for reading in character.findall('.//reading'):
                r_type = reading.get('r_type')
                if r_type == 'ja_on':
                    onyomi_list.append(reading.text)
                elif r_type == 'ja_kun':
                    kunyomi_list.append(reading.text)
            
            # Get meanings (English)
            meanings = []
            for meaning in character.findall('.//meaning'):
                if meaning.get('m_lang') is None:  # English has no lang attr
                    meanings.append(meaning.text)
            
            # Get stroke count
            stroke_count = ""
            stroke_elem = character.find('.//stroke_count')
            if stroke_elem is not None:
                stroke_count = stroke_elem.text
            
            # Get grade/JLPT level
            grade = ""
            grade_elem = character.find('.//grade')
            if grade_elem is not None:
                grade = grade_elem.text
            
            kanji_data[kanji] = {
                'kanji': kanji,
                'radical': radical,
                'onyomi': '、'.join(onyomi_list),
                'kunyomi': '、'.join(kunyomi_list),
                'meanings': ', '.join(meanings[:3]),  # First 3 meanings
                'stroke_count': stroke_count,
                'grade': grade
            }
        
        print(f"   ✅ Parsed {len(kanji_data)} kanji entries")
        
    except ET.ParseError as e:
        print(f"   ❌ XML Parse error: {e}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return kanji_data

def generate_similar_groups(kanji_data):
    """
    Generate similar kanji groups based on:
    1. Same radical
    2. Same On'yomi reading
    3. Same Kun'yomi reading
    """
    print("\n🔗 Generating similar kanji groups...")
    
    groups = []
    
    # Group by radical
    radical_groups = defaultdict(list)
    for kanji, data in kanji_data.items():
        if data['radical']:
            radical_groups[data['radical']].append(kanji)
    
    # Radical names (common ones)
    radical_names = {
        '1': '一 (いち)', '2': '丨 (ぼう)', '3': '丶 (てん)', '4': '丿 (の)',
        '5': '乙 (おつ)', '6': '亅 (かぎ)', '7': '二 (に)', '8': '亠 (なべぶた)',
        '9': '人/亻 (ひと)', '10': '儿 (にんにょう)', '11': '入 (いる)',
        '12': '八 (はち)', '13': '冂 (けいがまえ)', '14': '冖 (わかんむり)',
        '15': '冫 (にすい)', '16': '几 (つくえ)', '17': '凵 (かんにょう)',
        '18': '刀/刂 (かたな)', '19': '力 (ちから)', '20': '勹 (つつみがまえ)',
        '30': '口 (くち)', '32': '土 (つち)', '37': '大 (だい)',
        '38': '女 (おんな)', '40': '宀 (うかんむり)', '46': '山 (やま)',
        '57': '弓 (ゆみ)', '60': '彳 (ぎょうにんべん)', '61': '心/忄 (こころ)',
        '64': '手/扌 (て)', '72': '日 (ひ)', '74': '月 (つき/にくづき)',
        '75': '木 (き)', '85': '水/氵 (みず)', '86': '火/灬 (ひ)',
        '94': '犬/犭 (いぬ)', '96': '玉/王 (たま)', '102': '田 (た)',
        '109': '目 (め)', '112': '石 (いし)', '113': '示/礻 (しめす)',
        '115': '禾 (のぎ)', '118': '竹 (たけ)', '120': '糸 (いと)',
        '130': '肉/月 (にく)', '140': '艸/艹 (くさ)', '142': '虫 (むし)',
        '145': '衣/衤 (ころも)', '149': '言/訁 (ことば)', '154': '貝 (かい)',
        '157': '足 (あし)', '162': '辵/辶 (しんにょう)', '167': '金/釒 (かね)',
        '169': '門 (もん)', '170': '阝左 (こざと)', '172': '隹 (ふるとり)',
        '173': '雨 (あめ)', '184': '食/飠 (しょく)', '187': '馬 (うま)',
        '195': '魚 (うお)', '196': '鳥 (とり)'
    }
    
    for radical, kanji_list in radical_groups.items():
        if len(kanji_list) >= 2:  # Only groups with 2+ kanji
            radical_name = radical_names.get(radical, f"Radical {radical}")
            groups.append({
                'group_type': 'radical',
                'group_key': radical,
                'group_name': radical_name,
                'kanji_list': ','.join(kanji_list),
                'kanji_count': len(kanji_list)
            })
    
    # Group by On'yomi
    onyomi_groups = defaultdict(list)
    for kanji, data in kanji_data.items():
        if data['onyomi']:
            # Get first on'yomi reading
            first_on = data['onyomi'].split('、')[0].strip()
            if first_on:
                onyomi_groups[first_on].append(kanji)
    
    for reading, kanji_list in onyomi_groups.items():
        if len(kanji_list) >= 3:  # Only groups with 3+ kanji
            groups.append({
                'group_type': 'onyomi',
                'group_key': reading,
                'group_name': f"音読み: {reading}",
                'kanji_list': ','.join(kanji_list),
                'kanji_count': len(kanji_list)
            })
    
    # Group by Kun'yomi (first reading only)
    kunyomi_groups = defaultdict(list)
    for kanji, data in kanji_data.items():
        if data['kunyomi']:
            # Get first kun'yomi, remove okurigana marker
            first_kun = data['kunyomi'].split('、')[0].split('.')[0].strip()
            if first_kun and len(first_kun) >= 2:  # At least 2 characters
                kunyomi_groups[first_kun].append(kanji)
    
    for reading, kanji_list in kunyomi_groups.items():
        if len(kanji_list) >= 3:
            groups.append({
                'group_type': 'kunyomi',
                'group_key': reading,
                'group_name': f"訓読み: {reading}",
                'kanji_list': ','.join(kanji_list),
                'kanji_count': len(kanji_list)
            })
    
    print(f"   ✅ Generated {len(groups)} similar groups")
    print(f"      - Radical groups: {len([g for g in groups if g['group_type'] == 'radical'])}")
    print(f"      - On'yomi groups: {len([g for g in groups if g['group_type'] == 'onyomi'])}")
    print(f"      - Kun'yomi groups: {len([g for g in groups if g['group_type'] == 'kunyomi'])}")
    
    return groups

# ============================================
# PART 3: WRITE CSV FILES
# ============================================
def write_csv(data, filename, fieldnames):
    """Write data to CSV file"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            # Ensure all fields exist
            clean_row = {k: row.get(k, '') for k in fieldnames}
            writer.writerow(clean_row)
    
    print(f"   📁 Written: {filepath} ({len(data)} rows)")

# ============================================
# MAIN EXECUTION
# ============================================
def main():
    print("=" * 60)
    print("JLPT Kanji Data Parser")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📂 Output directory: {OUTPUT_DIR}/")
    
    # ---- PART 1: Parse Excel Stories ----
    if os.path.exists(EXCEL_FILE):
        groups, stories = parse_excel_stories(EXCEL_FILE)
        
        if groups:
            write_csv(
                groups,
                'japanese_kanji_story_groups.csv',
                ['group_number', 'group_kanji', 'group_meaning', 'group_story', 'onyomi']
            )
        
        if stories:
            write_csv(
                stories,
                'japanese_kanji_stories.csv',
                ['group_kanji', 'member_number', 'kanji', 'original_kanji', 'meaning', 'story', 'frame_number', 'onyomi']
            )
    else:
        print(f"\n⚠️ Excel file not found: {EXCEL_FILE}")
    
    # ---- PART 2: Parse KANJIDIC2 ----
    kanji_data = parse_kanjidic2(KANJIDIC_FILE)
    
    if kanji_data:
        similar_groups = generate_similar_groups(kanji_data)
        
        if similar_groups:
            write_csv(
                similar_groups,
                'japanese_kanji_similar_groups.csv',
                ['group_type', 'group_key', 'group_name', 'kanji_list', 'kanji_count']
            )
    
    # ---- Summary ----
    print("\n" + "=" * 60)
    print("✅ PARSING COMPLETE!")
    print("=" * 60)
    print(f"\nOutput files in '{OUTPUT_DIR}/' folder:")
    print("  1. japanese_kanji_story_groups.csv  → Upload to japanese_kanji_story_groups")
    print("  2. japanese_kanji_stories.csv       → Upload to japanese_kanji_stories")
    print("  3. japanese_kanji_similar_groups.csv → Upload to japanese_kanji_similar_groups")
    print("\nNext steps:")
    print("  1. Go to Supabase Dashboard → Table Editor")
    print("  2. Select each table → Import CSV")
    print("  3. Upload the corresponding CSV file")
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
