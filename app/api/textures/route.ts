import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const query = searchParams.get('query')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Call Python texture service
    const pythonProcess = spawn('python', [
      '-c',
      `
import sys
sys.path.append('${path.join(process.cwd(), 'backend')}')

from app.services.texture_service import texture_service
import json

if '${category}' and '${category}' != 'null':
    if '${query}' and '${query}' != 'null':
        textures = texture_service.search_textures('${query}', '${category}', ${limit})
    else:
        textures = texture_service.get_popular_textures('${category}', ${limit})
else:
    # Get mixed popular textures
    wall_textures = texture_service.get_popular_textures('walls', ${Math.floor(limit / 3)})
    floor_textures = texture_service.get_popular_textures('floors', ${Math.floor(limit / 3)})
    ceiling_textures = texture_service.get_popular_textures('ceilings', ${Math.floor(limit / 3)})

    textures = wall_textures + floor_textures + ceiling_textures

# Convert to simplified format for frontend
result = []
for texture in textures:
    result.append({
        'id': texture.get('assetId'),
        'name': texture.get('displayName'),
        'category': texture.get('displayCategory'),
        'previewUrl': texture.get('previewImage', {}).get('256-JPG-FFFFFF'),
        'tags': texture.get('tags', []),
        'downloadCount': texture.get('downloadCount', 0)
    })

print(json.dumps(result))
      `
    ], {
      cwd: process.cwd()
    })

    return new Promise<Response>((resolve) => {
      let data = ''
      let error = ''

      pythonProcess.stdout.on('data', (chunk) => {
        data += chunk.toString()
      })

      pythonProcess.stderr.on('data', (chunk) => {
        error += chunk.toString()
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const textures = JSON.parse(data)
            resolve(NextResponse.json(textures))
          } catch (e) {
            resolve(NextResponse.json({ error: 'Failed to parse texture data' }, { status: 500 }))
          }
        } else {
          resolve(NextResponse.json({ error: error || 'Failed to get textures' }, { status: 500 }))
        }
      })

      pythonProcess.on('error', (err) => {
        resolve(NextResponse.json({ error: 'Failed to execute texture service' }, { status: 500 }))
      })
    })

  } catch (error) {
    console.error('Textures API error:', error)
    return NextResponse.json({ error: 'Failed to load textures' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { assetId, mapType = 'color' } = await request.json()

    // Get texture data URL from Python service
    const pythonProcess = spawn('python', [
      '-c',
      `
import sys
sys.path.append('${path.join(process.cwd(), 'backend')}')

from app.services.texture_service import texture_service
import json

data_url = texture_service.get_texture_data_url('${assetId}', '${mapType}')
print(json.dumps({'dataUrl': data_url}))
      `
    ], {
      cwd: process.cwd()
    })

    return new Promise<Response>((resolve) => {
      let data = ''
      let error = ''

      pythonProcess.stdout.on('data', (chunk) => {
        data += chunk.toString()
      })

      pythonProcess.stderr.on('data', (chunk) => {
        error += chunk.toString()
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(data)
            if (result.dataUrl) {
              resolve(NextResponse.json(result))
            } else {
              resolve(NextResponse.json({ error: 'Texture not found' }, { status: 404 }))
            }
          } catch (e) {
            resolve(NextResponse.json({ error: 'Failed to parse texture data' }, { status: 500 }))
          }
        } else {
          resolve(NextResponse.json({ error: error || 'Failed to get texture' }, { status: 500 }))
        }
      })

      pythonProcess.on('error', (err) => {
        resolve(NextResponse.json({ error: 'Failed to execute texture service' }, { status: 500 }))
      })
    })

  } catch (error) {
    console.error('Texture download error:', error)
    return NextResponse.json({ error: 'Failed to download texture' }, { status: 500 })
  }
}