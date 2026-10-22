import sys, os
from PIL import Image, ImageFilter, ImageDraw, ImageFont

def censor_poster(image_path, banner_ratio=0.27):
    """
    LOXER Smart Contact Privacy Protection
    Replaces harsh opaque black boxes with clean, elegant transparent frosted glass blur.
    Blurs out contact information (email, phone, WA, addresses) while preserving
    poster aesthetics and colors beneath.
    """
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        return

    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"Failed to open image {image_path}: {e}")
        return

    w, h = img.size
    banner_height = int(h * banner_ratio)
    banner_top = h - banner_height

    # 1. Apply smooth Gaussian blur to bottom contact zone
    box = (0, banner_top, w, h)
    crop_area = img.crop(box)
    blurred = crop_area.filter(ImageFilter.GaussianBlur(radius=35))

    # Feathering mask (soft smooth fade at top edge over 35px using cubic smoothstep)
    fade_px = min(35, banner_height // 3)
    mask = Image.new('L', (w, banner_height), 255)
    for y in range(fade_px):
        t = y / fade_px
        alpha = int((t * t * (3 - 2 * t)) * 255)
        for x in range(w):
            mask.putpixel((x, y), alpha)
    img.paste(blurred, box, mask)

    # 2. Frosted glass transparent gradient overlay (seamlessly blended, no hard lines)
    overlay = Image.new('RGBA', (w, banner_height), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)

    for y in range(banner_height):
        p = y / max(1, banner_height - 1)
        # Translucent soft gradient: starts at 0 alpha, smoothly rises to 110 at bottom
        cur_alpha = int((p ** 1.3) * 110)
        draw_ov.line([(0, y), (w, y)], fill=(15, 23, 42, cur_alpha))

    # 3. Sleek modern frosted glass pill
    font_size_pill = int(max(13, h * 0.021))
    font_size_sub = int(max(10, h * 0.0145))
    try:
        font_pill = ImageFont.truetype('arialbd.ttf', font_size_pill)
        font_sub = ImageFont.truetype('arial.ttf', font_size_sub)
    except:
        font_pill = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    pill_text = '🔒 KONTAK & ALAMAT TERPROTEKSI'
    sub_text = 'Lamar resmi melalui tombol Lamar di aplikasi LOXER'

    bp = draw_ov.textbbox((0, 0), pill_text, font=font_pill)
    pw = bp[2] - bp[0]
    ph = bp[3] - bp[1]

    bs = draw_ov.textbbox((0, 0), sub_text, font=font_sub)
    sw = bs[2] - bs[0]
    sh = bs[3] - bs[1]

    pad_x = int(max(18, w * 0.038))
    pad_y = int(max(7, h * 0.009))
    pill_w = pw + pad_x * 2
    pill_h = ph + pad_y * 2

    pill_x0 = (w - pill_w) // 2
    total_h = pill_h + sh + int(h * 0.012)
    group_y0 = (banner_height - total_h) // 2 + int(banner_height * 0.06)

    # Draw rounded pill with frosted glass effect
    draw_ov.rounded_rectangle(
        [(pill_x0, group_y0), (pill_x0 + pill_w, group_y0 + pill_h)],
        radius=pill_h // 2,
        fill=(15, 23, 42, 175),
        outline=(56, 189, 248, 140),
        width=1
    )

    draw_ov.text((pill_x0 + pad_x, group_y0 + pad_y - 1), pill_text, fill=(56, 189, 248, 255), font=font_pill)
    draw_ov.text(((w - sw) // 2, group_y0 + pill_h + int(h * 0.009)), sub_text, fill=(241, 245, 249, 220), font=font_sub)

    # Paste overlay onto image
    img.paste(overlay, (0, banner_top), overlay)
    img.save(image_path, 'JPEG', quality=95)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        censor_poster(sys.argv[1])
