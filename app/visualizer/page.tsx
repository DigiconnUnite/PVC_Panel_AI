"use client"

// Visualizer: displays the image, fetched masks, and a simple product list
// Allows selecting a mask and sending a visualize request (stubbed to return original)

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { analyzeImage, getProducts, visualizeRoom, API_BASE_URL } from "@/lib/api"
import VisualizerCanvas from "@/components/visualizer-canvas"
import ThreeRoomVisualizer from "@/components/three-room-visualizer"
import { CheckCircle, Loader2, RefreshCcw, Info, Eye, Image as ImageIcon, Brush, Eraser, MousePointer2, Palette, Paintbrush, Layers, Lasso, Wand2, Box, Image } from "lucide-react"
import Background from "@/components/ui/Background"

export default function VisualizerPage() {
  const params = useSearchParams()
  const imageId = params.get("imageId") || ""
  const imageUrlRaw = params.get("url") || ""
  const imageUrl = imageUrlRaw.startsWith("http") ? imageUrlRaw : `${API_BASE_URL}${imageUrlRaw}`
  const {
    data: analysis,
    isLoading: loadingAnalysis,
    error: analysisError,
    mutate,
  } = useSWR(imageId ? ["analysis", imageId] : null, () => analyzeImage(imageId))
  const { data: products, isLoading: loadingProducts } = useSWR("products", getProducts, {
    fallbackData: []
  })

  const [selectedMasks, setSelectedMasks] = useState<number[]>([])
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [visualizing, setVisualizing] = useState(false)
  const [tool, setTool] = useState<"select" | "brush" | "erase" | "lasso" | "magic-wand">("select")
  const [activeCategory, setActiveCategory] = useState<"wallpapers" | "paints" | "pvc-panels">("wallpapers")
  const [customMask, setCustomMask] = useState<string | null>(null)
  const [visualizationMode, setVisualizationMode] = useState<"2d" | "3d">("2d")
  const [textureAssignments, setTextureAssignments] = useState<{ [key: number]: string }>({})
  const masks = useMemo(() => analysis?.masks ?? [], [analysis])

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return []
    return products.filter(product => {
      if (activeCategory === "pvc-panels") return product.type === "pvc-panel"
      if (activeCategory === "wallpapers") return product.type === "wallpaper"
      if (activeCategory === "paints") return product.type === "paint"
      return false
    })
  }, [products, activeCategory])

  async function handleVisualize(productId: string) {
    if (!imageId || (selectedMasks.length === 0 && !customMask)) return
    setVisualizing(true)
    try {
      // For now, use the first selected mask for visualization
      const maskIndex = selectedMasks.length > 0 ? selectedMasks[0] : undefined
      const out = await visualizeRoom({
        imageId,
        productId,
        maskIndex: maskIndex,
        customMask: customMask ?? undefined,
      })
      const abs = out.resultUrl.startsWith("http") ? out.resultUrl : `${API_BASE_URL}${out.resultUrl}`
      setResultUrl(abs)
    } finally {
      setVisualizing(false)
    }
  }

  function handleReset() {
    setResultUrl(null)
    setSelectedMasks([])
    setCustomMask(null)
    setTextureAssignments({})
  }

  function handleTextureAssign(maskIndex: number, textureId: string) {
    setTextureAssignments(prev => ({
      ...prev,
      [maskIndex]: textureId
    }))
  }

  function handleCustomMaskUpdate(maskDataUrl: string) {
    setCustomMask(maskDataUrl)
    setSelectedMasks([]) // Clear selected masks when using custom drawing
  }

  // Tool button component for DRYness
  function ToolButton({ toolType, icon, label }: { toolType: "select" | "brush" | "erase" | "lasso" | "magic-wand", icon: React.ReactNode, label: string }) {
    const isActive = tool === toolType
    return (
      <button
        type="button"
        className={`flex flex-row items-center justify-center px-3 py-1 rounded-lg text-nowrap border text-xs font-medium gap-1 transition
          ${isActive ? "bg-primary text-primary-foreground border-primary shadow" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"}
          disabled:opacity-50`}
        aria-pressed={isActive}
        onClick={() => setTool(toolType)}
        title={label}
      >
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <main className="min-h-screen relative p-0 md:p-0">


      <div className="mx-auto max-w-[98%] px-2 md:px-8 pt-5 pb-5" style={{ height: 'calc(100vh - 8rem)' }}>


        {/* Layout: Library (fit), Canvas (flex-grow), Inspector (small) */}
        <div
          className="w-full flex flex-col lg:flex-row gap-8 h-full"
        >
          {/* Sidebar library (elements/products) */}
          <aside
            className="bg-white border rounded-2xl shadow-lg p-6  flex flex-col min-w-[320px] max-w-[380px] flex-shrink-0"
            style={{ width: "fit-content", height: '100%' }}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Library
            </h2>
            <p className="text-xs text-slate-500 mb-4">Elements you can apply to the selected area.</p>

            {/* Category Tabs */}
            <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg flex-shrink-0">
              {([
                { key: "wallpapers", label: "Wallpapers", icon: <Layers className="w-3 h-3" /> },
                { key: "paints", label: "Paints", icon: <Paintbrush className="w-3 h-3" /> },
                { key: "pvc-panels", label: "Panels", icon: <Palette className="w-3 h-3" /> }
              ] as const).map(({ key, label, icon }) => {
                const count = products?.filter(p => {
                  if (key === "pvc-panels") return p.type === "pvc-panel"
                  if (key === "wallpapers") return p.type === "wallpaper"
                  if (key === "paints") return p.type === "paint"
                  return false
                }).length || 0

                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`flex-1 px-3 py-1 text-xs font-md rounded-md transition-all flex items-center justify-center gap-1 ${activeCategory === key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                  >
                    {icon}
                    <span>{label}</span>
                    <span className="ml-auto bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-xs min-w-[16px]">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Scrollable Products Section */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center flex-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'thin' }}>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        className={`group border rounded-xl p-2 text-left bg-slate-50 hover:bg-slate-100 transition-all duration-150 shadow-sm ${selectedMasks.length === 0 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          } ${visualizing ? "pointer-events-none opacity-50" : ""} ${resultUrl ? "opacity-40 pointer-events-none" : ""
                          }`}
                        onClick={() => handleVisualize(p.id)}
                        disabled={(selectedMasks.length === 0 && !customMask) || visualizing || !!resultUrl}
                        aria-disabled={(selectedMasks.length === 0 && !customMask) || visualizing || !!resultUrl}
                        title={(selectedMasks.length === 0 && !customMask) ? "Select a surface or draw a custom area first" : `Apply ${p.name}`}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-lg border bg-white flex items-center justify-center">
                          <img
                            src={p.thumbnailUrl || "/placeholder.svg"}
                            alt={p.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                          <div className="flex items-center justify-between">

                            {p.brand && (
                              <p className="text-xs text-slate-400 truncate">{p.brand}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Palette className="w-6 h-6 text-slate-400" />
                        </div>
                        <p>No {activeCategory} available</p>
                        <p className="text-xs text-slate-400">Try another category</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fixed footer info */}
            <div className="text-xs text-slate-400 mt-4 flex items-center gap-2 flex-shrink-0">
              <Info className="w-4 h-4" />
              {(selectedMasks.length === 0 && !customMask)
                ? "Tip: Select surfaces in the image or use brush/erase tools to draw a custom area."
                : "Now pick an item to apply to the selected surface."}
            </div>
          </aside>

          {/* Center: Canvas / Result */}
          <section className="min-h-[320px] relative flex flex-col items-center flex-1 max-w-full">
            {/* Tools bar overlay on canvas - hide when result is shown */}
            {!resultUrl && (
              <div className="absolute left-4 z-20 flex flex-row justify-content-between gap-2">
                {/* Visualization Mode Toggle */}
                <div className="inline-flex gap-1 bg-white/95 border border-slate-200 rounded-lg shadow px-2 py-1 pointer-events-auto">
                  <button
                    onClick={() => setVisualizationMode("2d")}
                    className={`flex items-center justify-center px-3 py-1 rounded text-xs font-medium gap-1 transition ${visualizationMode === "2d"
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    <Image className="w-4 h-4" />
                    2D
                  </button>
                  <button
                    onClick={() => setVisualizationMode("3d")}
                    className={`flex items-center justify-center px-3 py-1 rounded text-xs font-medium gap-1 transition ${visualizationMode === "3d"
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    <Box className="w-4 h-4" />
                    3D
                  </button>
                </div>

                {/* Tools bar - only show in 2D mode */}
                {visualizationMode === "2d" && (
                  <div className="inline-flex gap-1 bg-white/95 border border-slate-200 rounded-lg shadow px-2 py-1 pointer-events-auto">
                    <ToolButton
                      toolType="select"
                      icon={<MousePointer2 className="w-4 h-4" />}
                      label=""
                    />
                    <ToolButton
                      toolType="brush"
                      icon={<Brush className="w-4 h-4" />}
                      label=""
                    />
                    <ToolButton
                      toolType="erase"
                      icon={<Eraser className="w-4 h-4" />}
                      label=""
                    />
                    <ToolButton
                      toolType="lasso"
                      icon={<Lasso className="w-4 h-4" />}
                      label=""
                    />
                    <ToolButton
                      toolType="magic-wand"
                      icon={<Wand2 className="w-4 h-4" />}
                      label=""
                    />
                  </div>
                )}
              </div>
            )}
            <div className="relative rounded-2xl overflow-hidden min-h-[420px] flex flex-col items-center justify-center w-full">

              {resultUrl ? (
                <div className="w-full top-5 relative h-full flex flex-col items-center justify-center">
                  <img
                    src={resultUrl}
                    alt="Visualization result"
                    className="w-full h-auto object-contain rounded-2xl border bg-white shadow-md transition-all duration-300"
                    style={{ maxHeight: 700 }}
                  />
                  <div className="flex items-center gap-2 mt-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium text-sm">Visualization applied!</span>
                  </div>
                </div>
              ) : visualizationMode === "3d" ? (
                <ThreeRoomVisualizer
                  imageUrl={imageUrl || "/room-photo-placeholder.png"}
                  masks={masks}
                  selectedMaskIndex={selectedMasks}
                  textureAssignments={textureAssignments}
                  onTextureAssign={handleTextureAssign}
                  className="w-full h-[600px]"
                />
              ) : (
                <VisualizerCanvas
                  imageUrl={imageUrl || "/room-photo-placeholder.png"}
                  masks={masks}
                  selectedMaskIndex={selectedMasks}
                  onSelectMask={setSelectedMasks}
                  tool={tool}
                  onCustomMaskUpdate={handleCustomMaskUpdate}
                />
              )}
              {visualizing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                  <span className="text-slate-700 font-semibold text-lg">Applying product…</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 min-h-[28px] mt-4 px-2 w-full">
              {loadingAnalysis && (
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading segmentation…
                </span>
              )}
              {analysisError && (
                <span className="text-sm text-red-600 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Failed to load analysis. Try re-uploading the image.
                </span>
              )}
              {!loadingAnalysis && !analysisError && !resultUrl && (
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Click a surface to select it, then choose an item from the library.
                </span>
              )}
            </div>
          </section>

          {/* Right: Inspector */}
          <aside className="bg-white border rounded-2xl shadow-lg p-6 flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0" style={{ height: '100%' }}>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 flex-shrink-0">
              <Eye className="w-5 h-5 text-primary" />
              Inspector
            </h2>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* Surface Masks Panel */}
              {masks.length > 0 && (
                <div className="mb-6 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Recognized Surfaces</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                    {masks.map((mask, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const newSelected = [...selectedMasks]
                          const maskIndex = newSelected.indexOf(index)
                          if (maskIndex > -1) {
                            newSelected.splice(maskIndex, 1)
                          } else {
                            newSelected.push(index)
                          }
                          setSelectedMasks(newSelected)
                        }}
                        className={`relative p-2 border rounded-lg transition-all ${
                          selectedMasks.includes(index)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        title={`Surface ${index + 1} - ${selectedMasks.includes(index) ? 'Selected' : 'Click to select'}`}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded border bg-slate-100 flex items-center justify-center">
                          <img
                            src={`data:image/png;base64,${mask}`}
                            alt={`Surface ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 text-xs text-center font-medium">
                          #{index + 1}
                        </div>
                        {selectedMasks.includes(index) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics Panel */}
              <div className="space-y-3 text-base text-slate-700 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Image ID:</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs font-mono">{imageId.slice(0, 8) || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Masks:</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs">{masks.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Selected:</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    selectedMasks.length > 0 || customMask ? "bg-primary/10 text-primary font-bold" : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedMasks.length > 0 ? `${selectedMasks.length} surface${selectedMasks.length > 1 ? 's' : ''}` : customMask ? "Custom" : "none"}
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Action Button */}
            <button
              onClick={handleReset}
              className={`mt-4 w-full px-4 py-2 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow flex-shrink-0 ${
                !resultUrl && selectedMasks.length === 0 ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={!resultUrl && selectedMasks.length === 0 && !customMask}
            >
              <RefreshCcw className="w-4 h-4" />
              {resultUrl ? "Reset visualization" : "Clear selection"}
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}
