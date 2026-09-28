#!/usr/bin/env python3
"""Compose the 13-inch iPad App Store screenshot set (2064x2752) for Zephyr
Weather.

The raw app captures are taken from the iOS simulator (iPad Pro 13-inch) and
placed into the brand marketing template: cream background, dark-green blobs,
dashed circles, a bright-green device bezel and an Avenir Next headline.

Raw captures are expected in ``build/ipad_caps`` (untracked):

    raw-1.png      Home, top (current conditions)
    raw-2.png      Home, daily forecast + details grid
    raw-3.png      Home, details / air quality / sun & moon
    raw-daily.png  Forecast Detail screen for a single day
    raw-4.png      Radar tab

Capture them with, e.g.:

    xcrun simctl build ...           # Release build for the iPad simulator
    xcrun simctl launch <udid> com.zephyr.weather
    xcrun simctl io <udid> screenshot --type=png build/ipad_caps/raw-1.png

then run this script from the repository root:

    python3 scripts/make-ipad-appstore-screenshots.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAPS = os.path.join(ROOT, 'build', 'ipad_caps')
OUT = os.path.join(ROOT, 'screenshots', 'ipad-13')

W, H = 2064, 2752
CREAM = (246, 244, 233)
DGREEN = (18, 92, 64)
BEZEL = (0, 166, 80)
HEAD_DARK = (18, 92, 64)
HEAD_LIGHT = (172, 226, 175)

FONT = '/System/Library/Fonts/Avenir Next.ttc'
FONT_DEMI = 2

SCREEN_W = 1500


def font(size, index=FONT_DEMI):
    return ImageFont.truetype(FONT, size, index=index)


def dashed_ellipse(draw, center, rx, ry, color, width=4, dash=26, gap=24,
                   a_start=0, a_end=360):
    cx, cy = center
    ang = a_start
    while ang < a_end:
        pts = []
        a = ang
        end = min(ang + dash, a_end)
        while a <= end:
            r = math.radians(a)
            pts.append((cx + rx * math.cos(r), cy + ry * math.sin(r)))
            a += 1.5
        if len(pts) > 1:
            draw.line(pts, fill=color, width=width, joint='curve')
        ang += dash + gap


def blob(img, center, r, color=DGREEN):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r],
              fill=color + (255,))
    img.alpha_composite(layer)


def paste_device(canvas, screen_img, device_y):
    sw, sh = screen_img.size
    bw = 26
    r_out, r_in = 118, 92
    outer = (sw + bw * 2, sh + bw * 2)
    x = (W - outer[0]) // 2

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x + 24, device_y + 42, x + outer[0] + 24, device_y + outer[1] + 42],
        radius=r_out, fill=(0, 0, 0, 115))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(40)))

    bez = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(bez).rounded_rectangle(
        [x, device_y, x + outer[0], device_y + outer[1]],
        radius=r_out, fill=BEZEL + (255,))
    canvas.alpha_composite(bez)

    screen = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    screen.paste(screen_img, (x + bw, device_y + bw))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [x + bw, device_y + bw, x + bw + sw, device_y + bw + sh],
        radius=r_in, fill=255)
    screen.putalpha(mask)
    canvas.alpha_composite(screen)

    rim = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(rim).rounded_rectangle(
        [x + bw, device_y + bw, x + bw + sw, device_y + bw + sh],
        radius=r_in, outline=(255, 255, 255, 55), width=3)
    canvas.alpha_composite(rim)


def load_screen(path, crop, target_w):
    im = Image.open(path).convert('RGB').crop(crop)
    ratio = target_w / im.width
    return im.resize((target_w, round(im.height * ratio)), Image.LANCZOS)


def fit_size(lines, max_w, start=250):
    f = font(start)
    d = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    widest = max(d.textbbox((0, 0), line, font=f)[2] for line in lines)
    return int(start * max_w / widest)


def draw_headline(canvas, lines, color, top_y, size, line_gap=14):
    f = font(size)
    d = ImageDraw.Draw(canvas)
    y = top_y
    for line in lines:
        b = d.textbbox((0, 0), line, font=f)
        d.text((W // 2 - (b[2] - b[0]) / 2 - b[0], y - b[1]), line, font=f,
               fill=color)
        y += (b[3] - b[1]) + line_gap


TILES = {
    1: dict(crop=(0, 0, 2064, 2752), dy=1000,
            head=(["Simple and reliable", "weather forecasts"], HEAD_DARK, 400)),
    2: dict(crop=(0, 30, 2064, 1960), dy=560, head=None),
    3: dict(src='raw-daily', crop=(0, 0, 2064, 2380), dy=960,
            head=(["All the details you", "need to go about", "your day"],
                  HEAD_DARK, 250)),
    4: dict(crop=(0, 0, 2064, 2752), dy=300,
            head=(["High-res Radar"], HEAD_LIGHT, None)),
}


def build(n):
    cfg = TILES[n]
    bg = Image.new('RGBA', (W, H), CREAM + (255,))
    dr = ImageDraw.Draw(bg)

    if n == 1:
        blob(bg, (-520, -640), 1250)
        blob(bg, (1032, 3450), 1280)
        dashed_ellipse(dr, (1032, 640), 720, 250, DGREEN + (150,), 4, 30, 26, 205, 335)
    elif n == 2:
        blob(bg, (1032, 3950), 1800)
        blob(bg, (-300, 2750), 860)
        blob(bg, (2360, 2750), 860)
        dr.arc([280, 2050, 1780, 3000], 205, 335, fill=CREAM + (150,), width=3)
    elif n == 3:
        blob(bg, (1032, 4150), 1950)
        blob(bg, (-420, 2000), 900)
        dashed_ellipse(dr, (1032, 520), 770, 300, DGREEN + (150,), 4, 30, 26, 200, 340)
    elif n == 4:
        blob(bg, (1032, 4350), 2380)
        dr.arc([1150, 2350, 2450, 3150], 205, 355, fill=CREAM + (130,), width=3)

    paste_device(bg, load_screen(f"{CAPS}/{cfg.get('src', f'raw-{n}')}.png",
                                 cfg['crop'], SCREEN_W), cfg['dy'])

    if cfg['head']:
        lines, color, top = cfg['head']
        if n == 4:
            top = H - 300
        draw_headline(bg, lines, color, top, fit_size(lines, 1800))

    return bg.convert('RGB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for i in sorted(TILES):
        img = build(i)
        img.save(f'{OUT}/screenshot-{i}.png')
        print('wrote', f'{OUT}/screenshot-{i}.png', img.size)
