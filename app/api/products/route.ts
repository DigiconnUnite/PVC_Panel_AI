import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join, extname, basename } from 'path'

interface Product {
  id: string
  name: string
  type: string
  imageUrl: string
  thumbnailUrl: string
  price: number
  brand: string
  colors: string[]
}

export async function GET() {
  try {
    const productsDir = join(process.cwd(), 'public', 'products')
    const publicProductsDir = join(process.cwd(), 'public', 'products')

    const products: Product[] = []

    // Helper function to scan directory and create products
    const scanDirectory = async (dirPath: string, type: string, categoryName: string) => {
      try {
        const files = await readdir(dirPath)
        const imageFiles = files.filter(file =>
          ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file).toLowerCase())
        )

        for (const file of imageFiles) {
          const filePath = join(dirPath, file)
          const fileName = basename(file, extname(file))

          // Create product entry
          const product = {
            id: `${type}-${fileName.toLowerCase().replace(/\s+/g, '-')}`,
            name: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: type,
            imageUrl: `/products/${categoryName}/${file}`,
            thumbnailUrl: `/products/${categoryName}/${file}`,
            price: type === 'pvc-panel' ? 45.99 : type === 'wallpaper' ? 25.99 : type === 'paint' ? 18.99 : 0,
            brand: 'Custom',
            colors: ['#FFFFFF', '#F8F9FA', '#E9ECEF']
          }

          products.push(product)
        }
      } catch (error) {
        // Directory doesn't exist or can't be read, skip silently
        console.log(`Directory ${dirPath} not accessible, skipping ${categoryName}`)
      }
    }

    // Scan each product category
    await scanDirectory(join(productsDir, 'wallpapers'), 'wallpaper', 'wallpapers')
    await scanDirectory(join(productsDir, 'paints'), 'paint', 'paints')
    await scanDirectory(join(productsDir, 'pvc-panels'), 'pvc-panel', 'pvc-panels')

    // Also include existing public products as fallback
    try {
      const publicFiles = await readdir(publicProductsDir)
      const imageFiles = publicFiles.filter(file =>
        ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file).toLowerCase())
      )

      for (const file of imageFiles) {
        const fileName = basename(file, extname(file))
        const product = {
          id: `public-${fileName.toLowerCase().replace(/\s+/g, '-')}`,
          name: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'furniture', // Default type for public products
          imageUrl: `/products/${file}`,
          thumbnailUrl: `/products/${file}`,
          price: 0,
          brand: 'Default',
          colors: ['#8B5CF6', '#7C3AED', '#6D28D9']
        }
        products.push(product)
      }
    } catch (error) {
      // Public products directory not accessible, skip
    }

    // If no products found, return empty array
    if (products.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(products)

  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}