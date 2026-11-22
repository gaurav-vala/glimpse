"""
Generate minimal, premium app icons for Glimpse
Design: Minimalist geometric refractive glass prism / letter 'G' focal frame on OLED black.
Non-generic, clean monochrome aesthetic matching user's design reference.
"""
from PIL import Image, ImageDraw, ImageFilter
import math

SIZE = 1024

def create_glimpse_icon():
    # 1. Base image: Pitch Black (#000000)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    
    # We will draw with 4x supersampling for ultra-crisp edges
    SS = 4
    w = SIZE * SS
    h = SIZE * SS
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    
    center_x = w // 2
    center_y = h // 2
    
    # Outer squircle / rounded frame bounds
    frame_size = int(520 * SS)
    corner_radius = int(140 * SS)
    stroke_width = int(44 * SS)
    
    left = center_x - frame_size // 2
    top = center_y - frame_size // 2
    right = center_x + frame_size // 2
    bottom = center_y + frame_size // 2
    
    # Draw sleek outer rounded squircle in pure white
    # Subtle inner bevel / depth with two concentric rounded rects
    # Outer frame:
    draw.rounded_rectangle(
        [left, top, right, bottom],
        radius=corner_radius,
        outline=(255, 255, 255, 255),
        width=stroke_width
    )
    
    # Inner elegant geometric focal element forming a subtle 'G' shape:
    # A sleek horizontal bar extending inward from the right-center,
    # and a centered glowing luminous aperture dot / focal disc.
    bar_height = stroke_width
    bar_width = int(150 * SS)
    bar_top = center_y - bar_height // 2
    bar_bottom = center_y + bar_height // 2
    bar_right = right - stroke_width
    bar_left = bar_right - bar_width
    
    draw.rounded_rectangle(
        [bar_left, bar_top, bar_right, bar_bottom],
        radius=bar_height // 2,
        fill=(255, 255, 255, 255)
    )
    
    # Central focal circle (representing a glimpse of light / capture)
    dot_radius = int(58 * SS)
    draw.ellipse(
        [center_x - dot_radius, center_y - dot_radius, center_x + dot_radius, center_y + dot_radius],
        fill=(255, 255, 255, 255)
    )
    
    # Downsample with high-quality Lanczos resampling
    downscaled = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    
    # Composite onto pitch black
    img.alpha_composite(downscaled)
    return img, downscaled

def main():
    full_icon, glyph_transparent = create_glimpse_icon()
    
    # Save standard icon.png
    full_icon.save("assets/images/icon.png", "PNG")
    print("Saved assets/images/icon.png")
    
    # Save android-icon-background.png (pure black)
    bg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    bg.save("assets/images/android-icon-background.png", "PNG")
    print("Saved assets/images/android-icon-background.png")
    
    # Android foreground needs the icon centered inside the 432x432 safe zone (66% scaling)
    # Scale glyph to ~0.66 of size
    fg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    fg_size = int(SIZE * 0.62)
    glyph_scaled = glyph_transparent.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
    offset = (SIZE - fg_size) // 2
    fg.paste(glyph_scaled, (offset, offset), glyph_scaled)
    fg.save("assets/images/android-icon-foreground.png", "PNG")
    print("Saved assets/images/android-icon-foreground.png")
    
    # Monochrome icon (same foreground silhouette)
    fg.save("assets/images/android-icon-monochrome.png", "PNG")
    print("Saved assets/images/android-icon-monochrome.png")
    
    # Splash icon: 200x200 centered
    splash_size = 200
    splash = glyph_transparent.resize((splash_size, splash_size), Image.Resampling.LANCZOS)
    splash.save("assets/images/splash-icon.png", "PNG")
    print("Saved assets/images/splash-icon.png")

if __name__ == "__main__":
    main()
