from PIL import Image, ImageDraw, ImageFont

# Create a white image
img = Image.new('RGB', (800, 600), color = (255, 255, 255))
d = ImageDraw.Draw(img)

# Add text simulating a brokerage note
text = """
NOTA DE CORRETAGEM
Data: 15/01/2026

C/V  Mercadoria  Obs  Qtd  Preço/Ajuste  Valor/Ajuste  D/C
C    VALE3       ON   100  65,50         6.550,00      D
V    PETR4       PN   50   35,80         1.790,00      C

Total Líquido: 4.760,00 D
"""

# Draw text (using a default font since we might not have specific ttf)
# To make it readable without font file, we position lines manually or use default
# PIL default font is very small, but readable for OCR usually.
# Let's try to load a font if possible, otherwise fallback
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
except:
    font = ImageFont.load_default()

d.text((50, 50), text, fill=(0,0,0), font=font)

img.save('fake_brokerage_note.png')
print("Image saved as fake_brokerage_note.png")
