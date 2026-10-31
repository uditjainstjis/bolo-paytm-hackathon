# Builds public/shots/*.jpg from Udit's real Paytm screenshots, with personal data painted out.
# Patch coords are in "half" units (414-wide space); the HTML overlays in app.js use the same units.
from PIL import Image
import numpy as np, os
R = os.path.join(os.path.dirname(__file__), '../../real_screens')
OUT = os.path.join(os.path.dirname(__file__), '../public/shots')
os.makedirs(OUT, exist_ok=True)

def iphone(n, y1=2480):
    im = Image.open(f'{R}/udit_phone2/IMG_{n}.PNG').convert('RGB').crop((0, 135, 1170, y1))
    return im.resize((828, round(im.height * 828 / 1170)), Image.LANCZOS)

def patch(im, boxes):
    a = np.asarray(im).copy()
    for b in boxes:
        x0, y0, x1, y1 = [v * 2 for v in b[:4]]
        if len(b) > 4 and b[4] == 'row':  # fill each row from its left neighbour (for gradients)
            for y in range(y0, y1): a[y, x0:x1] = a[y, x0 - 3]
            continue
        if len(b) > 4 and b[4] == 'rrow':  # fill each row from its right neighbour
            for y in range(y0, y1): a[y, x0:x1] = a[y, x1 + 3]
            continue
        col = b[4] if len(b) > 4 else a[y0 + (y1 - y0) // 2, max(x0 - 3, 0)]
        a[y0:y1, x0:x1] = col
    return Image.fromarray(a)

def save(im, name, crop=None):
    if crop: im = im.crop((0, 0, 828, crop * 2))
    im.save(f'{OUT}/{name}.jpg', quality=80, optimize=True, progressive=True)
    print(name, im.size, os.path.getsize(f'{OUT}/{name}.jpg') // 1024, 'KB')

# home: Udit's Android, three scrolls stitched (offsets measured by image matching)
o = [Image.open(f'{R}/{f}').convert('RGB') for f in ['01_home.png', '02_home_scroll.png', '03_home_scroll2.png']]
b = np.asarray(o[1]).copy()
for y in range(2125, 2212): b[y, 270:820] = b[y, 250]  # paint out the Scan QR button in the seam band
o[1] = Image.fromarray(b)
c = Image.new('RGB', (1080, 3060 + 2130 - 290))
c.paste(o[0].crop((0, 290, 1080, 2130)), (0, 0))
c.paste(o[1].crop((0, 985, 1080, 2210)), (0, 2130 - 290))
c.paste(o[2].crop((0, 295, 1080, 2130)), (0, 3355 - 290))
save(c.resize((828, round(c.height * 828 / 1080)), Image.LANCZOS), 'home')
h = o[2].crop((0, 120, 1080, 276)); save(h.resize((828, round(h.height * 828 / 1080)), Image.LANCZOS), 'home_top')

W = (255, 255, 255)
save(patch(iphone('0891'), [(30, 199, 140, 216, W), (290, 619, 366, 638)]), 'history', crop=648)
save(patch(iphone('0892'), [(51, 18, 211, 52), (31, 118, 126, 162), (31, 165, 186, 188), (64, 257, 174, 278),
     (33, 390, 241, 410), (33, 536, 321, 566), (326, 536, 384, 594), (33, 568, 321, 590), (33, 630, 321, 680)]), 'txn', crop=700)
save(patch(iphone('0893'), [(20, 124, 404, 148), (22, 170, 400, 298, W), (26, 616, 88, 696), (26, 701, 88, 781), (92, 636, 220, 666), (92, 721, 210, 751)]), 'pay')
save(patch(iphone('0896'), [(178, 8, 236, 66, W), (110, 76, 300, 106, W), (150, 132, 265, 156, W), (100, 218, 315, 308, W), (85, 312, 330, 338, W)]), 'payamt')
save(patch(iphone('0897'), [(45, 58, 372, 86), (128, 186, 302, 264, 'row'), (236, 102, 270, 148, 'rrow'), (93, 350, 180, 374, W), (288, 324, 364, 349, W)]), 'score')
save(iphone('0901'), 'help')
save(patch(iphone('0898'), [(70, 211, 160, 240, W), (70, 268, 160, 296, W)]), 'bus')
save(patch(iphone('0899'), [(150, 12, 270, 50, W)]), 'bus_loading')
save(patch(iphone('0900'), [(120, 12, 300, 50, W)]), 'bus_results')
