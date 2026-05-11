from PIL import Image, ImageDraw, ImageFont
import os

BASE = 'd:/proyectos/top-secret'

W, H = 3840, 2160
BG       = (12, 12, 12)
GOLD     = (201, 168, 76)
GOLD_DIM = (90, 72, 28)
WHITE    = (255, 255, 255)
GRAY_I   = (18, 18, 18)

FP = 'C:/Windows/Fonts/'
f_big   = ImageFont.truetype(FP + 'impact.ttf', 200)
f_title = ImageFont.truetype(FP + 'impact.ttf', 130)
f_sub   = ImageFont.truetype(FP + 'ARIALNB.TTF',  52)
f_num   = ImageFont.truetype(FP + 'impact.ttf',  96)
f_name  = ImageFont.truetype(FP + 'ARIALNB.TTF',  38)

PLAYERS = [
    ('pauloco10',       19, 'pauloco10',       'Frente.png'),
    ('garayds',         12, 'garayds',         'Frente2.png'),
    ('AR-ELTIO',        21, 'AR-ELTIO',        'Frente2.png'),
    ('Alexisraies23',  3, 'Alexisraies23', 'Frente2.png'),
    ('Cabers14',         4, 'Cabers14',        'Frente.png'),
    ('Agubostero7',     31, 'Agubostero7',     'Frente2.png'),
    ('Huber236',         8, 'Huber236',        'Frente2.png'),
    ('zPibu__',         30, 'zPibu__',         'Frente2.png'),
    ('Juan_Martinez4',   6, 'Juan_Martinez4',  'Frente2.png'),
    ('RS32-DaniStone',  13, 'RS32-DaniStone',  'Frente2.png'),
    ('CipriMancini',    32, 'CipriMancini',    'Frente2.png'),
    ('Buraa07',          5, 'Buraa7',          'Frente2.png'),
    ('Guiidow',         20, 'Guiidow',         'Frente2.png'),
    ('BlackPanther-CG', 11, 'BlackPanther-CG', 'Frente2.png'),
    ('Lautavester7',     7, 'Lautavester7',    'Frente2.png'),
    ('Lucasmati_akd',    9, 'Lucasmati_akd',   'Frente2.png'),
]

COLS, ROWS = 4, 4
PAD_X   = 52
PAD_TOP = 222
PAD_BOT = 88
GAP     = 12

CARD_W = (W - 2*PAD_X - (COLS-1)*GAP) // COLS
CARD_H = (H - PAD_TOP - PAD_BOT - (ROWS-1)*GAP) // ROWS

SRC_W, SRC_H = 1280, 720

print(f'Card: {CARD_W}x{CARD_H}')

canvas = Image.new('RGB', (W, H), BG)
draw   = ImageDraw.Draw(canvas)

# ── HEADER ───────────────────────────────────────────────────
HDR_H = 210
draw.rectangle([0, HDR_H - 5, W, HDR_H], fill=GOLD)

logo_raw = Image.open(f'{BASE}/Top-Secret.png').convert('RGBA')
LOGO_H = 140
logo_w = int(logo_raw.width * LOGO_H / logo_raw.height)
logo   = logo_raw.resize((logo_w, LOGO_H), Image.LANCZOS)
canvas.paste(logo, (PAD_X, (HDR_H - LOGO_H)//2), logo)

tx = PAD_X + logo_w + 44
draw.text((tx, 20),  'TOP SECRET FC',                       font=f_title, fill=WHITE)
draw.text((tx, 148), 'PLANTILLA  *  TEMPORADA 2  *  2026', font=f_sub,   fill=GOLD)

bb = draw.textbbox((0,0), 'T2', font=f_big)
bw = bb[2] - bb[0]
draw.text((W - PAD_X - bw, 10), 'T2', font=f_big, fill=GOLD_DIM)

# ── PLAYER CARDS ─────────────────────────────────────────────
for idx, (key, num, folder, fname) in enumerate(PLAYERS):
    row = idx // COLS
    col = idx % COLS
    cx  = PAD_X + col * (CARD_W + GAP)
    cy  = PAD_TOP + row * (CARD_H + GAP)

    # Card background
    draw.rectangle([cx, cy, cx+CARD_W, cy+CARD_H], fill=(20, 20, 20))

    # Load image: scale to card width, crop from top
    img_path = f'{BASE}/Renders/{folder}/{fname}'
    try:
        raw    = Image.open(img_path).convert('RGBA')
        # Crop: center 65% width, top 62% height — zooms in on character
        cx_src = SRC_W // 2
        cw_src = int(SRC_W * 0.65)
        ch_src = int(SRC_H * 0.62)
        x0 = max(0, cx_src - cw_src // 2)
        x1 = min(SRC_W, x0 + cw_src)
        pre = raw.crop((x0, 0, x1, ch_src))

        # Scale so width = CARD_W
        scale    = CARD_W / pre.width
        scaled_h = int(pre.height * scale)
        scaled   = pre.resize((CARD_W, scaled_h), Image.LANCZOS)
        # Crop top CARD_H pixels
        crop_h  = min(CARD_H, scaled_h)
        cropped = scaled.crop((0, 0, CARD_W, crop_h))
        if crop_h < CARD_H:
            bg = Image.new('RGBA', (CARD_W, CARD_H), (20, 20, 20, 255))
            bg.paste(cropped, (0, 0), cropped)
            cropped = bg

        canvas.paste(cropped.convert('RGB'), (cx, cy))

        # Gradient at bottom for text readability
        FADE = 180
        for ln in range(FADE):
            t = ln / FADE
            a = t ** 1.4
            r = int(12 + (BG[0]-12)*a)
            g = int(12 + (BG[1]-12)*a)
            b = int(12 + (BG[2]-12)*a)
            draw.line([(cx, cy+CARD_H-FADE+ln), (cx+CARD_W, cy+CARD_H-FADE+ln)], fill=(r,g,b))

    except Exception as e:
        print(f'  ! {key}: {e}')
        draw.rectangle([cx, cy, cx+CARD_W, cy+CARD_H], fill=(22,22,22))
        draw.text((cx+CARD_W//2, cy+CARD_H//2), '?', font=f_num, fill=GOLD, anchor='mm')

    # Gold top border
    draw.rectangle([cx, cy, cx+CARD_W, cy+5], fill=GOLD)
    # Gold left bar on bottom strip
    STRIP = 90
    draw.rectangle([cx, cy+CARD_H-STRIP, cx+5, cy+CARD_H], fill=GOLD)

    # Number (gold)
    num_str = f'#{num}'
    draw.text((cx+18, cy+CARD_H-STRIP//2), num_str, font=f_num, fill=GOLD, anchor='lm')
    nb = draw.textbbox((0,0), num_str, font=f_num)
    num_w = nb[2]-nb[0]

    # Name (white) — truncate if needed
    name_disp = key.upper()
    while True:
        nb2 = draw.textbbox((0,0), name_disp, font=f_name)
        if nb2[2]-nb2[0] <= CARD_W - num_w - 52: break
        name_disp = name_disp[:-1]
    draw.text((cx + 18 + num_w + 20, cy+CARD_H-STRIP//2), name_disp, font=f_name, fill=WHITE, anchor='lm')

# ── FOOTER ───────────────────────────────────────────────────
FY = H - PAD_BOT
draw.rectangle([0, FY, W, FY+5], fill=GOLD)
draw.text((W//2, FY+(PAD_BOT-5)//2), 'TOP SECRET FC  *  ARGENTINA', font=f_sub, fill=GOLD, anchor='mm')

out = f'{BASE}/logos/temp2/Plantilla_T2_2026.png'
canvas.save(out, 'PNG', compress_level=6)
print(f'Saved: {out}')
