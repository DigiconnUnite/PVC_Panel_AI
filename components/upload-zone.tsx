// Simple drag-and-drop area for images
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud } from "lucide-react"

export default function UploadZone({
  onUploadComplete,
  disabled,
}: {
  onUploadComplete: (file: File) => void
  disabled?: boolean
}) {
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return
      if (acceptedFiles.length > 0) {
        setIsUploading(true)
        try {
          const file = acceptedFiles[0]
          onUploadComplete(file)
        } finally {
          setIsUploading(false)
        }
      }
    },
    [onUploadComplete, disabled],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: disabled || isUploading,
  })

  return (
    <div
      {...getRootProps()}
      className={`rounded-xl p-10 text-center cursor-pointer transition-colors bg-white shadow-sm border-2 border-dashed ${
        isDragActive ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"
      } ${isUploading || disabled ? "opacity-50" : ""}`}
      aria-disabled={isUploading || disabled}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      {isUploading ? (
        <p className="text-sm text-muted-foreground">Uploading…</p>
      ) : (
        <>
          <p className="text-base font-medium">Drag and drop your room photo</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse • Max 10MB</p>
          <div className="mt-4 mx-auto max-w-[520px] h-24 rounded-lg bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_1px,_transparent_1px)] bg-[size:16px_16px]" />
        </>
      )}
    </div>
  )
}
