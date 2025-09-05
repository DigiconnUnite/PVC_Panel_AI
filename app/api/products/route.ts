import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const productsDir = join(process.cwd(), 'public', 'products')

    // Mock products data for Vercel deployment
    // In production, you would scan the actual product directories
    const mockProducts = [
      // Furniture
      {
        id: 'furniture-1',
        name: 'Modern Chair',
        type: 'furniture',
        imageUrl: '/products/chair.png',
        thumbnailUrl: '/products/chair.png',
        price: 299.99,
        brand: 'FurniCo',
        colors: ['#8B5CF6', '#7C3AED', '#6D28D9']
      },
      {
        id: 'furniture-2',
        name: 'Comfort Sofa',
        type: 'furniture',
        imageUrl: '/products/sofa.png',
        thumbnailUrl: '/products/sofa.png',
        price: 899.99,
        brand: 'FurniCo',
        colors: ['#10B981', '#059669', '#047857']
      },

      // PVC Panels
      {
        id: 'pvc-1',
        name: 'White PVC Panel',
        type: 'pvc-panel',
        imageUrl: '/products/pvc-panels/white-panel.png',
        thumbnailUrl: '/products/pvc-panels/thumbs/white-panel.png',
        price: 28.99,
        brand: 'PanelTech',
        colors: ['#FFFFFF', '#F8F9FA', '#E9ECEF']
      },
      {
        id: 'pvc-2',
        name: 'Wood Grain PVC Panel',
        type: 'pvc-panel',
        imageUrl: '/products/pvc-panels/wood-grain.png',
        thumbnailUrl: '/products/pvc-panels/thumbs/wood-grain.png',
        price: 42.99,
        brand: 'PanelTech',
        colors: ['#92400E', '#B45309', '#D97706']
      },
      {
        id: 'pvc-3',
        name: 'Marble Effect PVC Panel',
        type: 'pvc-panel',
        imageUrl: '/products/pvc-panels/marble-effect.png',
        thumbnailUrl: '/products/pvc-panels/thumbs/marble-effect.png',
        price: 55.99,
        brand: 'PanelTech',
        colors: ['#E5E7EB', '#D1D5DB', '#9CA3AF']
      },
      {
        id: 'pvc-4',
        name: 'Geometric PVC Panel',
        type: 'pvc-panel',
        imageUrl: '/products/pvc-panels/geometric.png',
        thumbnailUrl: '/products/pvc-panels/thumbs/geometric.png',
        price: 48.99,
        brand: 'PanelTech',
        colors: ['#6B7280', '#4B5563', '#374151']
      }
    ]

    return NextResponse.json(mockProducts)

  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}