#!/usr/bin/env python3
"""
Generate placeholder product images for the AI Room Visualizer
"""

import os
from PIL import Image, ImageDraw, ImageFont
import colorsys

def create_placeholder_image(width, height, text, bg_color, text_color=(255, 255, 255)):
    """Create a placeholder image with text"""
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position to center it
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    # Draw text with outline for better visibility
    draw.text((x, y), text, font=font, fill=text_color)
    
    return img

def hex_to_rgb(hex_color):
    """Convert hex color to RGB"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def generate_product_images():
    """Generate all product images"""
    
    # Product definitions
    products = {
        "pvc-panels": [
            {
                "name": "white-panel",
                "colors": ["#FFFFFF", "#F8F8FF", "#F5F5F5"],
                "text": "White PVC Panel"
            },
            {
                "name": "wood-grain",
                "colors": ["#8B4513", "#A0522D", "#CD853F"],
                "text": "Wood Grain PVC"
            },
            {
                "name": "marble-effect",
                "colors": ["#E0E0E0", "#D3D3D3", "#C0C0C0"],
                "text": "Marble Effect PVC"
            },
            {
                "name": "geometric",
                "colors": ["#2C3E50", "#34495E", "#5D6D7E"],
                "text": "Geometric PVC"
            }
        ],
        "wallpapers": [
            {
                "name": "blue-modern",
                "colors": ["#3b82f6", "#1e40af", "#93c5fd"],
                "text": "Blue Modern"
            },
            {
                "name": "floral-pattern",
                "colors": ["#FF69B4", "#FFB6C1", "#FFC0CB"],
                "text": "Floral Pattern"
            },
            {
                "name": "striped",
                "colors": ["#2C3E50", "#34495E", "#5D6D7E"],
                "text": "Striped"
            },
            {
                "name": "abstract-art",
                "colors": ["#E74C3C", "#F39C12", "#F1C40F"],
                "text": "Abstract Art"
            }
        ],
        "paints": [
            {
                "name": "white-pure",
                "colors": ["#FFFFFF", "#F8F8FF", "#F5F5F5"],
                "text": "Pure White"
            },
            {
                "name": "navy-blue",
                "colors": ["#000080", "#191970", "#00008B"],
                "text": "Navy Blue"
            },
            {
                "name": "sage-green",
                "colors": ["#9CAF88", "#8FBC8F", "#90EE90"],
                "text": "Sage Green"
            },
            {
                "name": "warm-beige",
                "colors": ["#F5F5DC", "#DEB887", "#D2B48C"],
                "text": "Warm Beige"
            }
        ]
    }
    
    # Generate images for each product category
    for category, category_products in products.items():
        print(f"Generating {category} images...")
        
        # Create category directories
        category_dir = f"public/products/{category}"
        thumbs_dir = f"{category_dir}/thumbs"
        
        os.makedirs(category_dir, exist_ok=True)
        os.makedirs(thumbs_dir, exist_ok=True)
        
        for product in category_products:
            # Main product image (800x600)
            main_img = create_placeholder_image(
                800, 600, 
                product["text"], 
                hex_to_rgb(product["colors"][0]),
                (0, 0, 0) if product["colors"][0] in ["#FFFFFF", "#F8F8FF", "#F5F5F5"] else (255, 255, 255)
            )
            main_img.save(f"{category_dir}/{product['name']}.png")
            
            # Thumbnail image (300x300)
            thumb_img = create_placeholder_image(
                300, 300, 
                product["text"], 
                hex_to_rgb(product["colors"][0]),
                (0, 0, 0) if product["colors"][0] in ["#FFFFFF", "#F8F8FF", "#F5F5F5"] else (255, 255, 255)
            )
            thumb_img.save(f"{thumbs_dir}/{product['name']}.png")
            
            print(f"  Generated {product['name']}.png and thumbnail")

if __name__ == "__main__":
    print("Generating product images...")
    generate_product_images()
    print("Done! Product images generated successfully.")
