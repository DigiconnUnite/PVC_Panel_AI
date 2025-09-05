import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const { imageId, productId, maskIndex, customMask } = await request.json()

    if (!imageId || (!maskIndex && !customMask)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Load original image - try multiple possible locations
    const possiblePaths = [
      join(process.cwd(), 'public', 'uploads', `${imageId}.jpg`),
      join(process.cwd(), 'public', 'uploads', `${imageId}.png`),
      join(process.cwd(), 'data', 'images', `${imageId}.jpg`),
      join(process.cwd(), 'data', 'images', `${imageId}.png`),
      join(process.cwd(), 'data', 'images', `${imageId}.avif`),
    ]

    let imageBuffer: Buffer | null = null
    let foundPath = ''

    for (const path of possiblePaths) {
      try {
        imageBuffer = await readFile(path)
        foundPath = path
        console.log(`Found image at: ${path}`)
        break
      } catch (error) {
        continue
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: 'Image not found in any expected location' }, { status: 404 })
    }

    // Load product texture based on productId
    let productImagePath: string

    // Map productId to actual file paths
    const productMappings: { [key: string]: string } = {
      // PVC Panels
      "pvc-1": "products/pvc-panels/white-panel.png",
      "pvc-2": "products/pvc-panels/wood-grain.png",
      "pvc-3": "products/pvc-panels/marble-effect.png",
      "pvc-4": "products/pvc-panels/geometric.png",
      // Wallpapers
      "wallpaper-1": "products/wallpapers/blue-modern.png",
      "wallpaper-2": "products/wallpapers/floral-pattern.png",
      "wallpaper-3": "products/wallpapers/striped.png",
      "wallpaper-4": "products/wallpapers/abstract-art.png",
      // Paints
      "paint-1": "products/paints/white-pure.png",
      "paint-2": "products/paints/navy-blue.png",
      "paint-3": "products/paints/sage-green.png",
      "paint-4": "products/paints/warm-beige.png",
    }

    if (productId && productMappings[productId]) {
      productImagePath = join(process.cwd(), 'public', productMappings[productId])
    } else {
      // Fallback to a default product
      productImagePath = join(process.cwd(), 'public', 'products', 'wallpapers', 'blue-modern.png')
    }

    let productBuffer: Buffer

    try {
      productBuffer = await readFile(productImagePath)
      console.log(`Loaded product texture: ${productImagePath}`)
    } catch (error) {
      console.error(`Product texture not found: ${productImagePath}`, error)
      // Create a simple colored texture if product image not found
      productBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    }

    // Apply visualization (simplified for Vercel)
    const resultBuffer = await applySimpleVisualization(imageBuffer, productBuffer, maskIndex, customMask)

    // Save result
    const resultId = randomUUID()
    const resultFilename = `${resultId}.jpg`
    const resultPath = join(process.cwd(), 'public', 'results', resultFilename)

    // Ensure results directory exists
    try {
      await mkdir(join(process.cwd(), 'public', 'results'), { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    await writeFile(resultPath, resultBuffer)

    return NextResponse.json({
      resultUrl: `/results/${resultFilename}`
    })

  } catch (error) {
    console.error('Visualization error:', error)
    return NextResponse.json({ error: 'Visualization failed' }, { status: 500 })
  }
}

async function applySimpleVisualization(
  imageBuffer: Buffer,
  productBuffer: Buffer,
  maskIndex: number,
  customMask?: string
): Promise<Buffer> {
  try {
    // Use Sharp for image processing
    const image = sharp(imageBuffer)
    const product = sharp(productBuffer)

    // Get image metadata
    const metadata = await image.metadata()

    // Resize product to match image dimensions
    const overlayBuffer = await product
      .resize(metadata.width, metadata.height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer()

    // For now, apply a simple blend. In a full implementation,
    // you would decode the mask and apply it properly
    const result = await image
      .composite([{
        input: overlayBuffer,
        blend: 'overlay'
      }])
      .jpeg({ quality: 90 })
      .toBuffer()

    console.log(`Applied visualization with maskIndex: ${maskIndex}, customMask: ${!!customMask}`)
    return result

  } catch (error) {
    console.error('Simple visualization error:', error)
    // Return original image if processing fails
    return imageBuffer
  }
}