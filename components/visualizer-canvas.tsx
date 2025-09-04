"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { MousePointer2, Brush, Eraser } from "lucide-react"

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
  selectedMaskIndex: number | null
  onSelectMask: (index: number) => void
  tool: "select" | "brush" | "erase"
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({
      width: img.naturalWidth,
      height: img.naturalHeight
    })
  }, [])

  const handleMaskClick = useCallback((index: number) => {
    if (tool === "select") {
      onSelectMask(index)
    }
  }, [tool, onSelectMask])

  const handleMaskHover = useCallback((index: number | null) => {
    setHoveredMask(index)
  }, [])

  const getCanvasCoordinates = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !imageRef.current) return null

    const canvas = canvasRef.current
    const image = imageRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === "brush" || tool === "erase") {
      setIsDrawing(true)
      const coords = getCanvasCoordinates(e)
      if (coords && canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.beginPath()
          ctx.arc(coords.x, coords.y, tool === "brush" ? 10 : 15, 0, 2 * Math.PI)
          ctx.fillStyle = tool === "brush" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 1)"
          ctx.fill()
        }
      }
    }
  }, [tool, getCanvasCoordinates])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing && (tool === "brush" || tool === "erase") && canvasRef.current) {
      const coords = getCanvasCoordinates(e)
      if (coords) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.beginPath()
          ctx.arc(coords.x, coords.y, tool === "brush" ? 10 : 15, 0, 2 * Math.PI)
          ctx.fillStyle = tool === "brush" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 1)"
          ctx.fill()
        }
      }
    }
  }, [isDrawing, tool, getCanvasCoordinates])

  const handleMouseUp = useCallback(() => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false)
      // Convert canvas to data URL and notify parent
      const dataUrl = canvasRef.current.toDataURL("image/png")
      setCustomMask(dataUrl)
      if (onCustomMaskUpdate) {
        onCustomMaskUpdate(dataUrl)
      }
    }
  }, [isDrawing, onCustomMaskUpdate])

  // Clear custom mask when switching tools
  useEffect(() => {
    if (tool === "select" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        setCustomMask(null)
      }
    }
  }, [tool])

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
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            onLoad={handleImageLoad}
          />

          {/* Drawing Canvas */}
          {(tool === "brush" || tool === "erase") && (
            <canvas
              ref={canvasRef}
              width={imageSize.width}
              height={imageSize.height}
              className="absolute inset-0 w-full h-full object-contain pointer-events-auto"
              style={{
                width: imageRef.current?.width || "100%",
                height: imageRef.current?.height || "auto"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}

          {/* Mask Overlays */}
          {imageSize.width > 0 && masks.map((mask, index) => (
            <div
              key={index}
              className={`absolute inset-0 cursor-pointer transition-all duration-200 group ${selectedMaskIndex === index
                ? 'ring-4 ring-blue-500 ring-opacity-70'
                : hoveredMask === index
                  ? 'ring-2 ring-blue-300 ring-opacity-50'
                  : 'ring-0'
                }`}
              onClick={() => handleMaskClick(index)}
              onMouseEnter={() => handleMaskHover(index)}
              onMouseLeave={() => handleMaskHover(null)}
              title={`Surface ${index + 1} - Click to select`}
            >
              {/* Semi-transparent overlay for visual feedback */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${selectedMaskIndex === index
                  ? 'bg-blue-500 bg-opacity-20'
                  : hoveredMask === index
                    ? 'bg-blue-300 bg-opacity-10'
                    : 'bg-transparent'
                  }`}
              />

              {/* Mask image overlay */}
              <img
                src={`data:image/png;base64,${mask}`}
                alt={`Mask ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-60"
              />

              {/* Selection indicator */}
              {selectedMaskIndex === index && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  Selected
                </div>
              )}

              {/* Hover indicator */}
              {hoveredMask === index && selectedMaskIndex !== index && (
                <div className="absolute top-2 right-2 bg-blue-300 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  Hover
                </div>
              )}
            </div>
          ))}

          {/* Tool indicator */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md flex items-center gap-2">
            {tool === "select" && <MousePointer2 className="w-4 h-4 text-blue-500" />}
            {tool === "brush" && <Brush className="w-4 h-4 text-green-500" />}
            {tool === "erase" && <Eraser className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-medium capitalize text-slate-700">
              {tool === "select" ? "Selection Mode" : tool === "brush" ? "Brush Mode" : "Erase Mode"}
            </span>
          </div>

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