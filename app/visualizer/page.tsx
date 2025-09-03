"use client"

// Visualizer: displays the image, fetched masks, and a simple product list
// Allows selecting a mask and sending a visualize request (stubbed to return original)

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { analyzeImage, getProducts, visualizeRoom, API_BASE_URL } from "@/lib/api"
import VisualizerCanvas from "@/components/visualizer-canvas"
import { CheckCircle, Loader2, RefreshCcw, Info, Eye, Image as ImageIcon, Brush, Eraser, MousePointer2 } from "lucide-react"

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
  const { data: products, isLoading: loadingProducts } = useSWR("products", getProducts)

  const [selectedMask, setSelectedMask] = useState<number | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [visualizing, setVisualizing] = useState(false)
  const [tool, setTool] = useState<"select" | "brush" | "erase">("select")
  const masks = useMemo(() => analysis?.masks ?? [], [analysis])

  async function handleVisualize(productId: string) {
    if (!imageId || selectedMask == null) return
    setVisualizing(true)
    try {
      const out = await visualizeRoom({
        imageId,
        productId,
        maskIndex: selectedMask,
      })
      const abs = out.resultUrl.startsWith("http") ? out.resultUrl : `${API_BASE_URL}${out.resultUrl}`
      setResultUrl(abs)
    } finally {
      setVisualizing(false)
    }
  }

  function handleReset() {
    setResultUrl(null)
    setSelectedMask(null)
  }

  // Tool button component for DRYness
  function ToolButton({ toolType, icon, label }: { toolType: "select" | "brush" | "erase", icon: React.ReactNode, label: string }) {
    const isActive = tool === toolType
    return (
      <button
        type="button"
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg border text-xs font-medium gap-1 transition
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
    <main className="min-h-screen relative p-0 md:p-0 bg-gradient-to-br from-slate-50 to-slate-200">
      <div
        className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      ></div>
      <div className="mx-auto max-w-[1600px] px-2 md:px-8">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <ImageIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 drop-shadow-sm">Room Visualizer</h1>
          {resultUrl && (
            <button
              onClick={handleReset}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-semibold border border-slate-200 transition shadow-sm"
              title="Reset visualization"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_380px] gap-8">
          {/* Sidebar library (elements/products) */}
          <aside className="bg-white border rounded-2xl shadow-lg p-6 h-fit sticky top-6 self-start min-w-[260px]">
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Library
            </h2>
            <p className="text-xs text-slate-500 mb-4">Elements you can apply to the selected area.</p>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(products ?? []).map((p) => (
                  <button
                    key={p.id}
                    className={`group border rounded-xl p-2 text-left bg-slate-50 hover:bg-slate-100 transition-all duration-150 shadow-sm ${
                      selectedMask == null ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    } ${visualizing ? "pointer-events-none opacity-50" : ""} ${
                      resultUrl ? "opacity-40 pointer-events-none" : ""
                    }`}
                    onClick={() => handleVisualize(p.id)}
                    disabled={selectedMask == null || visualizing || !!resultUrl}
                    aria-disabled={selectedMask == null || visualizing || !!resultUrl}
                    title={selectedMask == null ? "Select a surface first" : `Apply ${p.name}`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-lg border bg-white flex items-center justify-center">
                      <img
                        src={p.thumbnailUrl || "/placeholder.svg"}
                        alt={p.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="text-xs text-slate-400 mt-4 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {selectedMask == null
                ? "Tip: Select a surface in the image to enable elements."
                : "Now pick an item to apply to the selected surface."}
            </div>
          </aside>

          {/* Center: Canvas / Result */}
          <section className="min-h-[420px] flex flex-col items-center">
            
            <div className="relative rounded-2xl overflow-hidden min-h-[420px] flex flex-col items-center justify-center w-full">
              {/* Tools bar: now compact, with gap below */}
              {!resultUrl && (
                <div className="w-full flex items-center justify-center z-20 mt-2 mb-3">
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
                  </div>
                </div>
              )}
              {resultUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
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
              ) : (
                <VisualizerCanvas
                  imageUrl={imageUrl || "/room-photo-placeholder.png"}
                  masks={masks}
                  selectedMaskIndex={selectedMask}
                  onSelectMask={setSelectedMask}
                  // Pass tool as prop for future brush/erase support
                  tool={tool}
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

          {/* Right: Inspector / Actions */}
          <aside className="bg-white border rounded-2xl shadow-lg p-6 h-fit sticky top-6 self-start min-w-[240px]">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Inspector
            </h2>
            <div className="space-y-3 text-base text-slate-700">
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
                  selectedMask != null ? "bg-primary/10 text-primary font-bold" : "bg-slate-100 text-slate-500"
                }`}>
                  {selectedMask != null ? `#${selectedMask + 1}` : "none"}
                </span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className={`mt-6 w-full px-4 py-2 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow ${
                !resultUrl && selectedMask == null ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={!resultUrl && selectedMask == null}
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
