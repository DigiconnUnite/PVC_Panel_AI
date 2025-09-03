// Minimal canvas that allows selecting masks by clicking approximate regions.
// NOTE: This is a simplified, client-only demo that renders a selected mask as an overlay.

"use client"

import { useEffect, useRef } from "react"

type Props = {
  imageUrl: string
  masks: string[] // base64-encoded PNGs (no data URL prefix)
  selectedMaskIndex: number | null
  onSelectMask: (index: number | null) => void
  tool?: "select" | "brush" | "erase"
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function loadMask(data: string): Promise<HTMLImageElement> {
  // data is base64 PNG without prefix; add one
  return loadImage(`data:image/png;base64,${data}`)
}

export default function VisualizerCanvas({ imageUrl, masks, selectedMaskIndex, onSelectMask, tool = "select" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskImagesRef = useRef<HTMLImageElement[] | null>(null)

  useEffect(() => {
    let disposed = false

    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = await loadImage(imageUrl)
      if (disposed) return

      const maxW = 900
      const scale = img.width > maxW ? maxW / img.width : 1
      const w = Math.floor(img.width * scale)
      const h = Math.floor(img.height * scale)

      canvas.width = w
      canvas.height = h
      if (!hitCanvasRef.current) {
        hitCanvasRef.current = document.createElement("canvas")
      }
      hitCanvasRef.current.width = w
      hitCanvasRef.current.height = h

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      if (selectedMaskIndex != null && masks[selectedMaskIndex]) {
        const maskImg = await loadMask(masks[selectedMaskIndex])
        if (disposed) return
        ctx.globalAlpha = 0.35
        ctx.drawImage(maskImg, 0, 0, w, h)
        ctx.globalAlpha = 1
      }
    }

    draw()
    return () => {
      disposed = true
    }
  }, [imageUrl, masks, selectedMaskIndex])

  // Cache mask images for fast hit-testing
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      const imgs: HTMLImageElement[] = []
      for (const m of masks) {
        try {
          const img = await loadMask(m)
          if (cancelled) return
          imgs.push(img)
        } catch {
          imgs.push(new Image())
        }
      }
      maskImagesRef.current = imgs
    }
    loadAll()
    return () => {
      cancelled = true
      maskImagesRef.current = null
    }
  }, [masks])

  function getCanvasPoint(evt: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (evt.clientX - rect.left) * scaleX
    const y = (evt.clientY - rect.top) * scaleY
    return { x: Math.max(0, Math.min(canvas.width - 1, x)), y: Math.max(0, Math.min(canvas.height - 1, y)) }
  }

  async function handleCanvasClick(evt: React.MouseEvent<HTMLCanvasElement>) {
    if (tool !== "select") return
    const point = getCanvasPoint(evt)
    if (!point) return
    const { x, y } = point
    const hit = hitCanvasRef.current
    if (!hit) return
    const hctx = hit.getContext("2d")
    if (!hctx) return

    // Test masks top-down; select first with alpha > threshold at point
    const maskImages = maskImagesRef.current || []
    const threshold = 10 // 0..255
    let chosen: number | null = null
    for (let i = 0; i < maskImages.length; i += 1) {
      const m = maskImages[i]
      if (!m || !m.width || !m.height) continue
      hctx.clearRect(0, 0, hit.width, hit.height)
      hctx.drawImage(m, 0, 0, hit.width, hit.height)
      const pixel = hctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data
      const alpha = pixel[3] // 0..255
      if (alpha > threshold) {
        chosen = i
        break
      }
    }
    onSelectMask(chosen)
  }

  return (
    <div className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-xl border bg-white shadow-sm">
        <div
          className="flex items-center justify-center p-4 md:p-6 bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_1px,_transparent_1px)] bg-[size:16px_16px]">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block max-h-[70vh]"
            aria-label="Visualizer canvas"
            onClick={handleCanvasClick}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-3 border mt-3 bg-white rounded-lg">
        {masks.map((_, i) => (
          <button
            key={i}
            className={`text-xs rounded px-2 py-1 border ${
              selectedMaskIndex === i ? "bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => onSelectMask(selectedMaskIndex === i ? null : i)}
            aria-pressed={selectedMaskIndex === i}
            title={`Select mask #${i + 1}`}
          >
            Mask {i + 1}
          </button>
        ))}
        {masks.length === 0 && (
          <p className="text-xs text-muted-foreground">No masks yet. Make sure analysis finished.</p>
        )}
      </div>
    </div>
  )
}
