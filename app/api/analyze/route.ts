import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile } from 'fs/promises'

// Mock analysis service for Vercel deployment
// In production, you might want to use external AI services or serverless functions

export async function POST(request: NextRequest) {
  try {
    const { imageId } = await request.json()

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
    }

    // For Vercel deployment, we'll provide mock segmentation data
    // In a real deployment, you would call your AI service here

    const mockMasks = [
      // Wall mask (blue)
      generateMockMask(800, 600, 'wall'),
      // Floor mask (green)
      generateMockMask(800, 600, 'floor'),
      // Ceiling mask (red)
      generateMockMask(800, 600, 'ceiling')
    ]

    const mockMetadata = {
      surfaces: [
        {
          type: 'wall',
          confidence: 0.85,
          bbox: [50, 50, 700, 400]
        },
        {
          type: 'floor',
          confidence: 0.82,
          bbox: [0, 450, 800, 150]
        },
        {
          type: 'ceiling',
          confidence: 0.78,
          bbox: [0, 0, 800, 100]
        }
      ]
    }

    return NextResponse.json({
      masks: mockMasks,
      metadata: mockMetadata
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function generateMockMask(width: number, height: number, type: string): string {
  // Create a simple mock mask based on surface type
  // In production, this would be actual segmentation results

  // For Vercel deployment, we'll create a simple base64 encoded mask
  // This is a simplified version without canvas dependency
  const mockMasks = {
    wall: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    floor: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    ceiling: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }

  return mockMasks[type as keyof typeof mockMasks] || mockMasks.wall
}