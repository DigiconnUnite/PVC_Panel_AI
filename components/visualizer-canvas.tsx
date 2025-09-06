"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { MousePointer2, Brush, Eraser, Lasso, Wand2, CheckCircle, Layers } from "lucide-react"

// Dotted Background Component
const DottedBackground = () => {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
  )
}

// Visualizer Canvas Component
interface VisualizerCanvasProps {
  imageUrl: string
  masks: string[]
  selectedMaskIndex: number[]
  onSelectMask: (indices: number[]) => void
  tool: "select" | "brush" | "erase" | "lasso" | "magic-wand"
  className?: string
  onCustomMaskUpdate?: (maskDataUrl: string) => void
}

const VisualizerCanvas = ({
  imageUrl,
  masks,
  selectedMaskIndex,
  onSelectMask,
  tool,
  className,
  onCustomMaskUpdate
}: VisualizerCanvasProps) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [hoveredMask, setHoveredMask] = useState<number | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [customMask, setCustomMask] = useState<string | null>(null)
  const [lassoPoints, setLassoPoints] = useState<Array<{x: number, y: number}>>([])
  const [isLassoDrawing, setIsLassoDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(15)
  const [overlayOpacity, setOverlayOpacity] = useState(0.7)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 })
  const [overlayScale, setOverlayScale] = useState(1.0)
  const [showOverlayControls, setShowOverlayControls] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [livePreviewCanvas, setLivePreviewCanvas] = useState<HTMLCanvasElement | null>(null)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool switching shortcuts
      if (e.key === 's' || e.key === 'S') {
        onSelectMask(selectedMaskIndex) // This will be updated to switch to select mode
      } else if (e.key === 'b' || e.key === 'B') {
        // Switch to brush mode
      } else if (e.key === 'e' || e.key === 'E') {
        // Switch to erase mode
      } else if (e.key === 'l' || e.key === 'L') {
        // Switch to lasso mode
      } else if (e.key === 'w' || e.key === 'W') {
        // Switch to magic wand mode
      } else if (e.key === '[' && brushSize > 5) {
        setBrushSize(prev => prev - 5)
      } else if (e.key === ']' && brushSize < 50) {
        setBrushSize(prev => prev + 5)
      } else if (e.key === 'Escape') {
        // Clear current selection or tool
        setLassoPoints([])
        setIsLassoDrawing(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [brushSize, selectedMaskIndex, onSelectMask])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }, [])

  const handleMaskClick = useCallback((index: number) => {
    if (tool === "select") {
      const newSelected = new Set(selectedMaskIndex)
      if (newSelected.has(index)) {
        newSelected.delete(index)
      } else {
        newSelected.add(index)
      }
      onSelectMask(Array.from(newSelected))
    } else if (tool === "magic-wand") {
      // Magic wand tool for selecting similar surfaces
      onSelectMask([index])
    }
  }, [tool, onSelectMask, selectedMaskIndex])

  const handleMaskHover = useCallback((index: number | null) => {
    setHoveredMask(index)
  }, [])

  const getCanvasCoordinates = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !imageRef.current) return null

    const canvas = canvasRef.current
    const image = imageRef.current
    const rect = canvas.getBoundingClientRect()

    // Get the actual displayed size of the image
    const imageRect = image.getBoundingClientRect()

    // Calculate scale factors based on displayed vs natural size
    const scaleX = image.naturalWidth / imageRect.width
    const scaleY = image.naturalHeight / imageRect.height

    // Calculate position relative to the image, not canvas
    const x = (e.clientX - imageRect.left) * scaleX
    const y = (e.clientY - imageRect.top) * scaleY

    return {
      x: Math.max(0, Math.min(image.naturalWidth, x)),
      y: Math.max(0, Math.min(image.naturalHeight, y))
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === "select" && e.button === 0) { // Left mouse button for panning
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    } else if (tool === "brush" || tool === "erase") {
      setIsDrawing(true)
      const coords = getCanvasCoordinates(e)
      if (coords && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          // Initialize drawing path
          ctx.beginPath()
          ctx.moveTo(coords.x, coords.y)
        }
      }
    } else if (tool === "lasso") {
      setIsLassoDrawing(true)
      const coords = getCanvasCoordinates(e)
      if (coords) {
        setLassoPoints([coords])
      }
    } else if (tool === "magic-wand") {
      const coords = getCanvasCoordinates(e)
      if (coords && canvasRef.current) {
        handleMagicWandSelection(coords)
      }
    }
  }, [tool, getCanvasCoordinates])

  const handleMagicWandSelection = useCallback((coords: {x: number, y: number}) => {
    if (!canvasRef.current || !imageRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Simple flood fill algorithm for magic wand
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
    const data = imageData.data

    // Get color at clicked position
    const x = Math.floor(coords.x)
    const y = Math.floor(coords.y)
    const index = (y * canvasRef.current.width + x) * 4

    const targetR = data[index]
    const targetG = data[index + 1]
    const targetB = data[index + 2]
    const tolerance = 30

    // Simple flood fill
    const visited = new Set<string>()
    const queue = [{x, y}]

    ctx.beginPath()
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"

    while (queue.length > 0) {
      const point = queue.shift()
      if (!point) continue

      const key = `${point.x},${point.y}`
      if (visited.has(key)) continue
      visited.add(key)

      const idx = (point.y * canvasRef.current.width + point.x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Check if color is within tolerance
      if (Math.abs(r - targetR) < tolerance &&
          Math.abs(g - targetG) < tolerance &&
          Math.abs(b - targetB) < tolerance) {

        ctx.fillRect(point.x, point.y, 1, 1)

        // Add neighbors
        if (point.x > 0) queue.push({x: point.x - 1, y: point.y})
        if (point.x < canvasRef.current.width - 1) queue.push({x: point.x + 1, y: point.y})
        if (point.y > 0) queue.push({x: point.x, y: point.y - 1})
        if (point.y < canvasRef.current.height - 1) queue.push({x: point.x, y: point.y + 1})
      }
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && tool === "select") {
      const deltaX = e.clientX - lastPanPoint.x
      const deltaY = e.clientY - lastPanPoint.y
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    } else if (isDrawing && (tool === "brush" || tool === "erase") && canvasRef.current) {
      const coords = getCanvasCoordinates(e)
      if (coords) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          // Optimize drawing by using lineTo for smoother strokes
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.lineWidth = tool === "brush" ? brushSize * 2 : (brushSize + 5) * 2

          if (tool === "brush") {
            ctx.globalCompositeOperation = "source-over"
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
          } else {
            ctx.globalCompositeOperation = "destination-out"
            ctx.strokeStyle = "rgba(0, 0, 0, 1)"
          }

          ctx.lineTo(coords.x, coords.y)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(coords.x, coords.y)
        }
      }
    } else if (isLassoDrawing && tool === "lasso") {
      const coords = getCanvasCoordinates(e)
      if (coords) {
        setLassoPoints(prev => [...prev, coords])
      }
    }
  }, [isPanning, tool, lastPanPoint, isDrawing, getCanvasCoordinates, brushSize, isLassoDrawing])

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
    } else if (isDrawing && canvasRef.current) {
      setIsDrawing(false)
      // Convert canvas to data URL and notify parent
      const dataUrl = canvasRef.current.toDataURL("image/png")
      setCustomMask(dataUrl)
      if (onCustomMaskUpdate) {
        onCustomMaskUpdate(dataUrl)
      }
    } else if (isLassoDrawing && tool === "lasso" && canvasRef.current) {
      setIsLassoDrawing(false)

      // Complete lasso selection
      if (lassoPoints.length > 2 && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.beginPath()
          ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y)

          for (let i = 1; i < lassoPoints.length; i++) {
            ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y)
          }

          ctx.closePath()
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
          ctx.fill()

          // Convert to data URL
          const dataUrl = canvasRef.current.toDataURL("image/png")
          setCustomMask(dataUrl)
          if (onCustomMaskUpdate) {
            onCustomMaskUpdate(dataUrl)
          }
        }
      }

      setLassoPoints([])
    }
  }, [isPanning, isDrawing, onCustomMaskUpdate, isLassoDrawing, tool, lassoPoints])

  // Clear custom mask when switching tools
  useEffect(() => {
    if (tool === "select" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        // Optimize clearing by only clearing the used area
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        setCustomMask(null)
      }
    }
  }, [tool])

  // Optimize canvas rendering
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
      }
    }
  }, [])

  // Wheel event handler for zooming
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.1, Math.min(5, prev * zoomFactor)))
  }, [])

  // Reset pan and zoom
  const resetView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  // Update live preview canvas
  const updateLivePreview = useCallback(() => {
    if (!livePreviewCanvas || !canvasRef.current) return

    const previewCtx = livePreviewCanvas.getContext("2d")
    const drawingCtx = canvasRef.current.getContext("2d")

    if (previewCtx && drawingCtx) {
      // Clear preview
      previewCtx.clearRect(0, 0, livePreviewCanvas.width, livePreviewCanvas.height)

      // Copy drawing canvas content to preview
      const imageData = drawingCtx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
      previewCtx.putImageData(imageData, 0, 0)

      // Add a subtle glow effect for live preview
      previewCtx.shadowColor = "rgba(59, 130, 246, 0.5)"
      previewCtx.shadowBlur = 10
      previewCtx.globalCompositeOperation = "source-over"
    }
  }, [livePreviewCanvas])

  // Update live preview when drawing changes
  useEffect(() => {
    if (isDrawing || isLassoDrawing) {
      updateLivePreview()
    }
  }, [isDrawing, isLassoDrawing, lassoPoints, updateLivePreview])

  return (
    <div className={`relative ${className}`}>
      <DottedBackground />

      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative">
          {/* Main Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Room visualization"
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg cursor-move"
            onLoad={handleImageLoad}
            onWheel={handleWheel}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          />

          {/* Live Preview Canvas - only show when enabled */}
          {showLivePreview && (
            <canvas
              ref={(ref) => {
                if (ref && !livePreviewCanvas) {
                  setLivePreviewCanvas(ref)
                }
              }}
              width={imageSize.width}
              height={imageSize.height}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                width: imageRef.current?.offsetWidth || "100%",
                height: imageRef.current?.offsetHeight || "auto",
                imageRendering: "pixelated",
                opacity: 0.8
              }}
            />
          )}

          {/* Drawing Canvas */}
          {(tool === "brush" || tool === "erase" || tool === "lasso" || tool === "magic-wand") && (
            <canvas
              ref={canvasRef}
              width={imageSize.width}
              height={imageSize.height}
              className="absolute inset-0 w-full h-full pointer-events-auto"
              style={{
                width: imageRef.current?.offsetWidth || "100%",
                height: imageRef.current?.offsetHeight || "auto",
                imageRendering: "pixelated"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}

          {/* Lasso Preview */}
          {tool === "lasso" && isLassoDrawing && lassoPoints.length > 1 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                width: imageRef.current?.offsetWidth || "100%",
                height: imageRef.current?.offsetHeight || "auto"
              }}
            >
              <polygon
                points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </svg>
          )}

          {/* Tools Panel */}
          {(tool === "brush" || tool === "erase" || tool === "lasso" || tool === "magic-wand") && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
              <div className="flex flex-col gap-2">
                {/* Brush Size Indicator */}
                {(tool === "brush" || tool === "erase") && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Size:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setBrushSize(Math.max(5, brushSize - 5))}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium text-slate-800 min-w-[24px] text-center">
                        {brushSize}
                      </span>
                      <button
                        onClick={() => setBrushSize(Math.min(50, brushSize + 5))}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Preview Toggle */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Live Preview:</label>
                  <button
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className={`w-8 h-4 rounded-full transition-colors ${showLivePreview ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${showLivePreview ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selection Status */}
          {(selectedMaskIndex.length > 0 || customMask) && (
            <div className="absolute bottom-4 left-4 bg-green-500/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedMaskIndex.length > 0 ? `${selectedMaskIndex.length} surface(s) selected` : "Custom selection ready"}
                </span>
              </div>
            </div>
          )}


          {/* Mask Overlays */}
          {imageSize.width > 0 && masks.map((mask, index) => (
            <div
              key={index}
              className={`absolute inset-0 cursor-pointer transition-all duration-200 group ${selectedMaskIndex.includes(index)
                ? 'ring-2 ring-green-500 ring-opacity-80'
                : 'ring-0'
                }`}
              onClick={() => handleMaskClick(index)}
              onMouseEnter={() => handleMaskHover(index)}
              onMouseLeave={() => handleMaskHover(null)}
              title={`Surface ${index + 1} - Click to ${selectedMaskIndex.includes(index) ? 'deselect' : 'select'}`}
            >
              {/* Remove overlay effect on hover - only show selection */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${selectedMaskIndex.includes(index)
                  ? 'bg-green-500 bg-opacity-10'
                  : 'bg-transparent'
                  }`}
              />

              {/* Mask image overlay - higher opacity for selected masks */}
              <img
                src={`data:image/png;base64,${mask}`}
                alt={`Mask ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${selectedMaskIndex.includes(index) ? 'opacity-70' : 'opacity-30'}`}
              />

              {/* Selection indicator */}
              {selectedMaskIndex.includes(index) && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  ✓ Selected
                </div>
              )}

              {/* Remove hover indicator */}
            </div>
          ))}


          {/* Instructions overlay */}
          {masks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <div className="text-center text-slate-500">
                <MousePointer2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No surfaces detected</p>
                <p className="text-xs">Upload an image to see segmentation results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VisualizerCanvas