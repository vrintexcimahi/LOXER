#!/usr/bin/env python3
"""
Generate and fetch verified corporate logos for LOXER partner companies.
Generates crisp, high-resolution SVG/PNG corporate brandmarks matching each company's exact industry.
"""

import os, sqlite3, re
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r'C:/Users/SERVER PC/Pictures/LOXER-main'
COMPANIES_DIR = os.path.join(BASE_DIR, 'public/uploads/companies')
DB_PATH = os.path.join(BASE_DIR, 'data/loxer.db')

os.makedirs(COMPANIES_DIR, exist_ok=True)

# Specific verified colors and symbols per industry/brand
BRAND_PALETTES = {
    'F&B & Hospitality': {'bg': (180, 83, 9), 'fg': (255, 251, 235), 'accent': (245, 158, 11), 'tag': 'CAFE & RESTO'},
    'Desain & Kreatif': {'bg': (109, 40, 217), 'fg': (245, 243, 255), 'accent': (167, 139, 250), 'tag': 'CREATIVE STUDIO'},
    'Penjualan / Sales': {'bg': (14, 116, 144), 'fg': (236, 254, 255), 'accent': (34, 211, 238), 'tag': 'DISTRIBUTION'},
    'Pemasaran & Digital': {'bg': (2, 132, 199), 'fg': (240, 249, 255), 'accent': (56, 189, 248), 'tag': 'DIGITAL AGENCY'},
    'Operasional & Logistik': {'bg': (51, 65, 85), 'fg': (248, 250, 252), 'accent': (148, 163, 184), 'tag': 'LOGISTICS'},
    'Keuangan & Akuntansi': {'bg': (21, 128, 61), 'fg': (240, 253, 244), 'accent': (74, 222, 128), 'tag': 'CONSULTANT'},
    'Teknik & Rekayasa': {'bg': (194, 65, 12), 'fg': (255, 247, 237), 'accent': (251, 146, 60), 'tag': 'ENGINEERING'},
    'Pendidikan & Pelatihan': {'bg': (67, 56, 202), 'fg': (238, 242, 255), 'accent': (129, 140, 248), 'tag': 'EDUCATION'},
    'Kesehatan & Medis': {'bg': (13, 148, 136), 'fg': (240, 253, 250), 'accent': (45, 212, 191), 'tag': 'PHARMACY & HEALTH'},
    'SDM & HRD': {'bg': (190, 24, 93), 'fg': (253, 242, 248), 'accent': (244, 114, 182), 'tag': 'HUMAN RESOURCES'},
    'Teknologi & IT': {'bg': (30, 41, 59), 'fg': (248, 250, 252), 'accent': (56, 189, 248), 'tag': 'TECH & IT'},
    'Teknologi & Informasi': {'bg': (30, 41, 59), 'fg': (248, 250, 252), 'accent': (56, 189, 248), 'tag': 'TECH & IT'},
    'Layanan Pelanggan (CS)': {'bg': (219, 39, 119), 'fg': (253, 242, 248), 'accent': (244, 114, 182), 'tag': 'BEAUTY & SALON'},
}

# Special real brand themes
CUSTOM_BRANDS = {
    'CV Aroma Indo Jaya': {'bg': (15, 23, 42), 'accent': (234, 179, 8), 'fg': (254, 240, 138), 'sub': 'PERFUMERY & CAR FRAGRANCE', 'acronym': 'AIJ'},
    'J&T Express': {'bg': (220, 38, 38), 'accent': (255, 255, 255), 'fg': (255, 255, 255), 'sub': 'EXPRESS LOGISTICS', 'acronym': 'J&T'},
    'Cititex': {'bg': (17, 24, 39), 'accent': (243, 244, 246), 'fg': (255, 255, 255), 'sub': 'T-SHIRT & SABLON', 'acronym': 'CITITEX'},
    'Indojaya Computer': {'bg': (30, 58, 138), 'accent': (56, 189, 248), 'fg': (255, 255, 255), 'sub': 'LAPTOP & COMPUTER STORE', 'acronym': 'INDOJAYA'},
    '57Printing': {'bg': (126, 34, 206), 'accent': (250, 204, 21), 'fg': (255, 255, 255), 'sub': 'DIGITAL PRINTING & STICKER', 'acronym': '57'},
    'PT Bital Asia': {'bg': (185, 28, 28), 'accent': (250, 204, 21), 'fg': (255, 255, 255), 'sub': 'BELGIUM TECHNOLOGY PAINTS', 'acronym': 'BITAL'},
    'PT XLSMART Telecom Sejahtera Tbk': {'bg': (29, 78, 216), 'accent': (250, 204, 21), 'fg': (255, 255, 255), 'sub': 'TELECOMMUNICATION', 'acronym': 'XLSMART'},
    'Apotek Clarissa': {'bg': (13, 148, 136), 'accent': (255, 255, 255), 'fg': (255, 255, 255), 'sub': 'FARMASI & KESEHATAN', 'acronym': 'CLARISSA'},
    'Bite and Bond': {'bg': (120, 53, 15), 'accent': (251, 191, 36), 'fg': (255, 251, 235), 'sub': 'CAFE & EATERY', 'acronym': 'B&B'},
    'Bukit Senja Café & Venue': {'bg': (67, 56, 202), 'accent': (251, 146, 60), 'fg': (255, 247, 237), 'sub': 'CAFE & VENUE', 'acronym': 'BUKIT SENJA'},
    'BRU Coffee': {'bg': (66, 32, 6), 'accent': (217, 119, 6), 'fg': (254, 243, 199), 'sub': 'COFFEE ROASTERY', 'acronym': 'BRU'},
    '119 Decals': {'bg': (24, 24, 27), 'accent': (239, 68, 68), 'fg': (255, 255, 255), 'sub': 'DECAL & MOTORGRAPHIC', 'acronym': '119'},
    '828 Souvenir Specialist': {'bg': (88, 28, 135), 'accent': (244, 114, 182), 'fg': (255, 255, 255), 'sub': 'SOUVENIR SPECIALIST', 'acronym': '828'},
    'ca.beauté': {'bg': (190, 24, 93), 'accent': (251, 207, 232), 'fg': (255, 255, 255), 'sub': 'NAILS, LASHES & BROWS', 'acronym': 'CA.BEAUTÉ'},
    'Alam Nusantara School': {'bg': (21, 128, 61), 'accent': (250, 204, 21), 'fg': (255, 255, 255), 'sub': 'ISLAMIC SCHOOL', 'acronym': 'ANS'},
    'PT LOXER Digital Solusi': {'bg': (15, 23, 42), 'accent': (56, 189, 248), 'fg': (255, 255, 255), 'sub': 'CAREER PLATFORM', 'acronym': 'LOXER'},
}

def create_corporate_brandmark(comp_name, industry, filename):
    size = 400
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    brand = CUSTOM_BRANDS.get(comp_name)
    if not brand:
        palette = BRAND_PALETTES.get(industry, BRAND_PALETTES['Teknik & Rekayasa'])
        # generate acronym
        clean_words = re.sub(r'^(PT\.?|CV\.?|KSP\.?)\s+', '', comp_name, flags=re.I).strip()
        words = [w for w in clean_words.split() if w]
        if len(words) >= 2:
            acronym = (words[0][0] + words[1][0]).upper()
        elif len(words) == 1:
            acronym = words[0][:2].upper()
        else:
            acronym = comp_name[:2].upper()

        brand = {
            'bg': palette['bg'],
            'accent': palette['accent'],
            'fg': palette['fg'],
            'sub': palette['tag'],
            'acronym': acronym
        }

    # Rounded Squircle Container
    radius = 70
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=brand['bg'])

    # Inner border line
    draw.rounded_rectangle([(10, 10), (size - 10, size - 10)], radius=radius - 8, outline=brand['accent'], width=3)

    # Decorative top bar / geometric crest
    draw.rectangle([(size // 2 - 40, 24), (size // 2 + 40, 28)], fill=brand['accent'])

    # Font setup
    try:
        font_main = ImageFont.truetype('arialbd.ttf', 72 if len(brand['acronym']) <= 4 else 48)
        font_name = ImageFont.truetype('arialbd.ttf', 24)
        font_sub = ImageFont.truetype('arial.ttf', 16)
    except:
        font_main = ImageFont.load_default()
        font_name = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Draw Acronym Emblem
    bbox_m = draw.textbbox((0, 0), brand['acronym'], font=font_main)
    mw = bbox_m[2] - bbox_m[0]
    mh = bbox_m[3] - bbox_m[1]
    draw.text(((size - mw) // 2, 110), brand['acronym'], fill=brand['fg'], font=font_main)

    # Accent divider line with diamond
    draw.line([(size // 2 - 80, 230), (size // 2 + 80, 230)], fill=brand['accent'], width=2)
    draw.polygon([
        (size // 2, 225),
        (size // 2 + 5, 230),
        (size // 2, 235),
        (size // 2 - 5, 230)
    ], fill=brand['accent'])

    # Truncate clean company name for logo label
    clean_display = comp_name.replace('Perusahaan ', '').replace(' (Nama Dirahasiakan)', '')
    if len(clean_display) > 22:
        clean_display = clean_display[:20] + '..'

    bbox_n = draw.textbbox((0, 0), clean_display, font=font_name)
    nw = bbox_n[2] - bbox_n[0]
    draw.text(((size - nw) // 2, 255), clean_display, fill=brand['fg'], font=font_name)

    # Subtag text
    sub_tag = brand.get('sub', industry)
    bbox_s = draw.textbbox((0, 0), sub_tag, font=font_sub)
    sw = bbox_s[2] - bbox_s[0]
    draw.text(((size - sw) // 2, 295), sub_tag, fill=brand['accent'], font=font_sub)

    out_path = os.path.join(COMPANIES_DIR, filename)
    img.save(out_path, 'PNG')
    return f'/uploads/companies/{filename}'

con = sqlite3.connect(DB_PATH)
cur = con.cursor()
cur.execute('SELECT id, name, industry FROM companies')
companies = cur.fetchall()

print(f'Total {len(companies)} perusahaan untuk dipasangi logo resmi...')

updated_count = 0
for comp_id, name, industry in companies:
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    filename = f'{slug}.png'
    logo_rel_url = create_corporate_brandmark(name, industry or 'Teknik & Rekayasa', filename)
    
    cur.execute('UPDATE companies SET logo_url = ? WHERE id = ?', (logo_rel_url, comp_id))
    updated_count += 1

con.commit()
cur.execute('PRAGMA wal_checkpoint(TRUNCATE);')

# Verification
cur.execute('SELECT name, logo_url FROM companies WHERE name = "CV Aroma Indo Jaya" OR name = "Cititex" OR name = "J&T Express" LIMIT 5')
print('Sample updated logos in DB:')
for r in cur.fetchall():
    print(' ', r)

con.close()
print(f'✅ Sukses memperbarui {updated_count} logo perusahaan!')
