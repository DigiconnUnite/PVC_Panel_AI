import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { spawn } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    const { imageId, productId, maskIndex, customMask } = await request.json()

    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId parameter' }, { status: 400 })
    }

    // Find the image file
    const possiblePaths = [
      join(process.cwd(), 'public', 'uploads', `${imageId}.jpg`),
      join(process.cwd(), 'public', 'uploads', `${imageId}.png`),
      join(process.cwd(), 'data', 'images', `${imageId}.jpg`),
      join(process.cwd(), 'data', 'images', `${imageId}.png`),
      join(process.cwd(), 'data', 'images', `${imageId}.avif`),
    ]

    let imagePath = ''
    for (const path of possiblePaths) {
      try {
        await readFile(path)
        imagePath = path
        console.log(`Found image at: ${path}`)
        break
      } catch (error) {
        continue
      }
    }

    if (!imagePath) {
      return NextResponse.json({ error: 'Image not found in any expected location' }, { status: 404 })
    }

    // Call the advanced backend visualization service
    const result = await callBackendVisualization(imagePath, productId, maskIndex, customMask)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Visualization failed' }, { status: 500 })
    }

    return NextResponse.json({
      resultUrl: result.resultUrl
    })

  } catch (error) {
    console.error('Visualization error:', error)
    return NextResponse.json({ error: 'Visualization failed' }, { status: 500 })
  }
}

async function callBackendVisualization(
  imagePath: string,
  productId: string,
  maskIndex?: number,
  customMask?: string
): Promise<{ success: boolean; resultUrl?: string; error?: string }> {
  return new Promise((resolve) => {
    // Get the backend directory path
    const backendDir = join(process.cwd(), 'backend')
    const pythonScript = join(backendDir, 'app', 'main.py')

    // Prepare arguments for the backend call
    const args = [
      pythonScript,
      'visualize',
      '--image', imagePath,
      '--product', productId || 'pvc-1'
    ]

    if (maskIndex !== undefined) {
      args.push('--mask-index', maskIndex.toString())
    }

    if (customMask) {
      args.push('--custom-mask', customMask)
    }

    console.log('Calling backend visualization:', args.join(' '))

    // Spawn Python process
    const pythonProcess = spawn('python', args, {
      cwd: backendDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      console.log('Backend process exited with code:', code)
      console.log('Backend stdout:', stdout)
      console.log('Backend stderr:', stderr)

      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim())
          resolve({
            success: true,
            resultUrl: result.result_url
          })
        } catch (parseError) {
          console.error('Failed to parse backend response:', parseError)
          resolve({
            success: false,
            error: 'Failed to parse backend response'
          })
        }
      } else {
        resolve({
          success: false,
          error: stderr || 'Backend visualization failed'
        })
      }
    })

    pythonProcess.on('error', (error) => {
      console.error('Failed to start backend process:', error)
      resolve({
        success: false,
        error: 'Failed to start backend visualization'
      })
    })
  })
}