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

    // Load original image
    const imagePath = join(process.cwd(), 'public', 'uploads', `${imageId}.jpg`)
    let imageBuffer: Buffer

    try {
      imageBuffer = await readFile(imagePath)
    } catch (error) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Load product texture (mock implementation)
    const productImagePath = join(process.cwd(), 'public', 'products', 'wallpapers', 'blue-modern.png')
    let productBuffer: Buffer

    try {
      productBuffer = await readFile(productImagePath)
    } catch (error) {
      // Create a simple colored texture if product image not found
      // For Vercel deployment, we'll use a simple approach
      productBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    }

    // Apply visualization (simplified for Vercel)
    const resultBuffer = await applySimpleVisualization(imageBuffer, productBuffer, maskIndex)

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
  maskIndex: number
): Promise<Buffer> {
  try {
    // Use Sharp for image processing
    const image = sharp(imageBuffer)
    const product = sharp(productBuffer)

    // Get image metadata
    const metadata = await image.metadata()

    // Create a simple overlay effect
    // In a real implementation, you would apply proper segmentation masks
    const overlayBuffer = await product
      .resize(metadata.width, metadata.height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer()

    const result = await image
      .composite([{
        input: overlayBuffer,
        blend: 'overlay'
      }])
      .jpeg({ quality: 90 })
      .toBuffer()

    return result

  } catch (error) {
    console.error('Simple visualization error:', error)
    // Return original image if processing fails
    return imageBuffer
  }
}