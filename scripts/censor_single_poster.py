import sys, os
from PIL import Image, ImageFilter

def censor_poster(image_path, banner_ratio=0.19, radius=32):
    """
    LOXER Smart Contact Privacy Protection - Pure Sensor Blur
    Directly blurs out contact information (email, phone, WA, addresses, application links)
    in the bottom contact area using clean Gaussian blur.
    NO text overlay, NO banners, NO explanations on the post.
    """
    if not os.path.exists(image_path):
        return

    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        print(f"Failed to open image {image_path}: {e}")
        return

    w, h = img.size
    banner_height = int(h * banner_ratio)
    banner_top = h - banner_height

    # 1. Extract bottom contact area
    box = (0, banner_top, w, h)
    crop_area = img.crop(box)

    # 2. Apply Gaussian blur to completely obscure text/digits
    blurred = crop_area.filter(ImageFilter.GaussianBlur(radius=radius))

    # 3. Smooth feathering at top edge
    fade_px = min(20, banner_height // 4)
    if fade_px > 0:
        mask = Image.new('L', (w, banner_height), 255)
        for y in range(fade_px):
            t = y / fade_px
            alpha = int((t * t * (3 - 2 * t)) * 255)
            for x in range(w):
                mask.putpixel((x, y), alpha)
        img.paste(blurred, box, mask)
    else:
        img.paste(blurred, box)

    img.save(image_path, 'JPEG', quality=95)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        censor_poster(sys.argv[1])
