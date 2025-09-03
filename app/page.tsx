// Simple home page linking to upload and visualizer

import Background from "@/components/ui/Background"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-6">
      <Background />
      <div className="max-w-md w-full space-y-6 text-center relative z-10">
        <h1 className="text-2xl font-semibold text-balance">AI Room Visualizer</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Upload a photo of your room, run AI segmentation, and preview materials.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Get Started
          </Link>
          <Link href="/visualizer" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">
            Open Visualizer
          </Link>
        </div>
      </div>
    </main>
  )
}
