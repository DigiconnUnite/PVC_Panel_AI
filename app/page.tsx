// Simple home page linking to upload and visualizer

import Background from "@/components/ui/Background"
import Link from "next/link"
import { Library, Upload, Eye, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen relative flex items-center justify-center ">
      <Background />
      <div className="max-w-4xl w-full  text-center relative z-10">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-black mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">AI Room Visualizer</h1>
          </div>
          <p className="text-lg text-gray-600 text-pretty max-w-2xl mx-auto">
            Transform your space with AI-powered room visualization. Upload photos, explore our extensive material library, and see how different finishes look in your room.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <Library className="h-12 w-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Material Library</h3>
            <p className="text-sm text-gray-600 mb-4">
              Explore our curated collection of PVC panels, wallpapers, and paints
            </p>
            <Link
              href="/library"
              className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Browse Library
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <Upload className="h-12 w-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload & Analyze</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload room photos and let AI detect walls, floors, and surfaces
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <Eye className="h-12 w-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visualize Results</h3>
            <p className="text-sm text-gray-600 mb-4">
              See how different materials look in your space with realistic previews
            </p>
            <Link
              href="/visualizer"
              className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Open Visualizer
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        {/* <div className="flex items-center justify-center gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-md bg-black text-white px-6 py-3 text-base font-medium hover:bg-gray-800 transition-colors"
          >
            Start Your Project
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white text-gray-700 px-6 py-3 text-base font-medium hover:bg-gray-50 transition-colors"
          >
            Explore Materials
          </Link>
        </div> */}
      </div>
    </main>
  )
}
