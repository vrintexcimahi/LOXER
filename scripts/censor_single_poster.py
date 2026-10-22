import sys, os
from PIL import Image, ImageFilter, ImageDraw, ImageFont

def censor_poster(image_path):
    if not os.path.exists(image_path):
        return
    img = Image.open(image_path).convert('RGB')
    w, h = img.size

    # The contact banner is at bottom 19%
    banner_height = int(h * 0.19)
    banner_top = h - banner_height

    # 1. Apply heavy Gaussian blur to bottom
    box = (0, banner_top, w, h)
    crop_area = img.crop(box)
    blurred = crop_area.filter(ImageFilter.GaussianBlur(radius=30))
    img.paste(blurred, box)

    # 2. Draw a dark semi-transparent shield overlay
    overlay = Image.new('RGBA', (w, banner_height), (15, 23, 42, 245))
    draw = ImageDraw.Draw(overlay)

    # Decorative top border
    draw.line([(0, 0), (w, 0)], fill=(56, 189, 248, 255), width=int(max(2, h * 0.004)))

    # Add text
    font_size_title = int(max(16, h * 0.026))
    font_size_sub = int(max(12, h * 0.018))
    
    try:
        font_title = ImageFont.truetype('arialbd.ttf', font_size_title)
        font_sub = ImageFont.truetype('arial.ttf', font_size_sub)
    except:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    title_text = '🔒 KONTAK & ALAMAT RESMI TERPROTEKSI'
    sub_text = 'Lamar pekerjaan ini secara resmi melalui tombol Lamar di aplikasi LOXER'

    bbox_title = draw.textbbox((0, 0), title_text, font=font_title)
    title_w = bbox_title[2] - bbox_title[0]
    title_h = bbox_title[3] - bbox_title[1]

    bbox_sub = draw.textbbox((0, 0), sub_text, font=font_sub)
    sub_w = bbox_sub[2] - bbox_sub[0]
    sub_h = bbox_sub[3] - bbox_sub[1]

    total_h = title_h + sub_h + int(h * 0.015)
    start_y = (banner_height - total_h) // 2

    draw.text(((w - title_w) // 2, start_y), title_text, fill=(56, 189, 248), font=font_title)
    draw.text(((w - sub_w) // 2, start_y + title_h + int(h * 0.015)), sub_text, fill=(226, 232, 240), font=font_sub)

    img.paste(overlay, (0, banner_top), overlay)
    img.save(image_path, 'JPEG', quality=95)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        censor_poster(sys.argv[1])
