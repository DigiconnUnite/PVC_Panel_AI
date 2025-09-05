import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const productsDir = join(process.cwd(), 'public', 'products')

    // Mock products data for Vercel deployment
    // In production, you would scan the actual product directories
    const mockProducts = [
      // Wallpapers
      {
        id: 'wallpaper-1',
        name: 'Blue Modern Wallpaper',
        type: 'wallpaper',
        imageUrl: '/products/wallpapers/blue-modern.png',
        thumbnailUrl: '/products/wallpapers/thumbs/blue-modern.png',
        price: 45.99,
        brand: 'DesignCo',
        colors: ['#3B82F6', '#1E40AF', '#1E3A8A']
      },
      {
        id: 'wallpaper-2',
        name: 'Floral Pattern Wallpaper',
        type: 'wallpaper',
        imageUrl: '/products/wallpapers/floral-pattern.png',
        thumbnailUrl: '/products/wallpapers/thumbs/floral-pattern.png',
        price: 52.99,
        brand: 'NatureDesign',
        colors: ['#10B981', '#059669', '#047857']
      },
      {
        id: 'wallpaper-3',
        name: 'Striped Wallpaper',
        type: 'wallpaper',
        imageUrl: '/products/wallpapers/striped.png',
        thumbnailUrl: '/products/wallpapers/thumbs/striped.png',
        price: 38.99,
        brand: 'ClassicStyle',
        colors: ['#F59E0B', '#D97706', '#B45309']
      },
      {
        id: 'wallpaper-4',
        name: 'Abstract Art Wallpaper',
        type: 'wallpaper',
        imageUrl: '/products/wallpapers/abstract-art.png',
        thumbnailUrl: '/products/wallpapers/thumbs/abstract-art.png',
        price: 67.99,
        brand: 'Artisan',
        colors: ['#8B5CF6', '#7C3AED', '#6D28D9']
      },

      // Paints
      {
        id: 'paint-1',
        name: 'White Pure Paint',
        type: 'paint',
        imageUrl: '/products/paints/white-pure.png',
        thumbnailUrl: '/products/paints/thumbs/white-pure.png',
        price: 34.99,
        brand: 'PaintPro',
        colors: ['#FFFFFF', '#F8F9FA', '#E9ECEF']
      },
      {
        id: 'paint-2',
        name: 'Navy Blue Paint',
        type: 'paint',
        imageUrl: '/products/paints/navy-blue.png',
        thumbnailUrl: '/products/paints/thumbs/navy-blue.png',
        price: 36.99,
        brand: 'PaintPro',
        colors: ['#1E3A8A', '#1E40AF', '#3B82F6']
      },
      {
        id: 'paint-3',
        name: 'Sage Green Paint',
        type: 'paint',
        imageUrl: '/products/paints/sage-green.png',
        thumbnailUrl: '/products/paints/thumbs/sage-green.png',
        price: 35.99,
        brand: 'PaintPro',
        colors: ['#10B981', '#059669', '#047857']
      },
      {
        id: 'paint-4',
        name: 'Warm Beige Paint',
        type: 'paint',
        imageUrl: '/products/paints/warm-beige.png',
        thumbnailUrl: '/products/paints/thumbs/warm-beige.png',
        price: 31.99,
        brand: 'PaintPro',
        colors: ['#D97706', '#B45309', '#92400E']
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