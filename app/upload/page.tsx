"use client"

// Upload page: select image, upload to backend, trigger analyze, then navigate to visualizer

import { useRouter } from "next/navigation"
import { useState } from "react"
import UploadZone from "@/components/upload-zone"
import { uploadImage, analyzeImage, API_BASE_URL } from "@/lib/api"

export default function UploadPage() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function handleUploadComplete(file: File) {
    setError(null)
    setBusy(true)
    try {
      const uploaded = await uploadImage(file)
      // Optional: kick off analysis immediately
      await analyzeImage(uploaded.imageId)
      // Go to visualizer with the uploaded image context
      const absoluteUrl = uploaded.url.startsWith("http") ? uploaded.url : `${API_BASE_URL}${uploaded.url}`
      const params = new URLSearchParams({
        imageId: uploaded.imageId,
        url: absoluteUrl,
      })
      router.push(`/visualizer?${params.toString()}`)
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen relative p-6">
      <div
        className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      ></div>
      <div className="relative z-10 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Upload a Room Photo</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop an image (JPEG, PNG, WebP up to 10MB). We&apos;ll run segmentation next.
        </p>
        <UploadZone onUploadComplete={handleUploadComplete} disabled={busy} />
        {busy && <p className="text-sm text-muted-foreground">Processing...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  )
}
