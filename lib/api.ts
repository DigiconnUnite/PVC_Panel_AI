// Client for backend API (FastAPI). Uses NEXT_PUBLIC_API_URL.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type UploadResponse = {
  imageId: string
  url: string
}

export type AnalysisResult = {
  masks: string[] // base64 PNGs without data URL prefix
  metadata: {
    surfaces?: Array<{
      type?: string
      confidence?: number
      bbox?: number[]
    }>
  }
}

export type Product = {
  id: string
  name: string
  type: string
  imageUrl: string
  thumbnailUrl: string
  price: number
  brand?: string
  colors?: string[]
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append("file", file, file.name)
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export async function analyzeImage(imageId: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageId }),
  })
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`)
  return res.json()
}

export async function visualizeRoom(input: { imageId: string; productId: string; maskIndex?: number; customMask?: string }) {
  const res = await fetch(`${API_BASE_URL}/api/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`Visualize failed: ${res.status}`)
  return res.json() as Promise<{ resultUrl: string }>
}

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/api/products`)
  if (!res.ok) throw new Error(`Products failed: ${res.status}`)
  const data = await res.json()

  // Handle both flat array and structured response formats
  if (Array.isArray(data)) {
    // New format: flat array of products
    return data
  } else {
    // Legacy format: structured response with categories
    const products: Product[] = []
    if (data.pvc_panels) products.push(...data.pvc_panels)
    if (data.wallpapers) products.push(...data.wallpapers)
    if (data.paints) products.push(...data.paints)
    return products
  }
}
