"use client"

import { Heart, Github, ExternalLink } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">AI Room Visualizer</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Transform your space with AI-powered interior design. Upload your room photo and visualize
              wallpapers, paints, and PVC panels instantly.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Quick Links</h4>
            <div className="space-y-2">
              <a href="/upload" className="block text-sm text-slate-600 hover:text-slate-800 transition-colors">
                Upload Room
              </a>
              <a href="/library" className="block text-sm text-slate-600 hover:text-slate-800 transition-colors">
                Product Library
              </a>
              <a href="/visualizer" className="block text-sm text-slate-600 hover:text-slate-800 transition-colors">
                Visualizer
              </a>
            </div>
          </div>

          {/* Contact/Tech Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Technology</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Powered by AI</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Built with Next.js</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Deployed on Vercel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>© {currentYear} AI Room Visualizer. Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <span>for interior designers.</span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/DigiconnUnite/PVC_Panel_AI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>View Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}