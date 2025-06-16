"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { MemberData } from "@/types/api-types"

interface IdSettingsProps {
  memberData: MemberData
  onSettingsChange: (settings: IdSettings) => void
  uploadedImageUrl: string | null
  onImageUpload: (url: string | null) => void
  editableName: string
  onNameChange: (name: string) => void
  isNameInputEditable: boolean
  uploadedImagePosition: { x: number; y: number } // Add this prop
  onImagePositionChange?: (position: { x: number; y: number }) => void // Add this prop
}

export interface IdSettings {
  position: string
  namePosition: { x: number; y: number }
  nameFont: string
  nameWidth: number
  nameAlign: CanvasTextAlign
  memberIdPosition: { x: number; y: number }
  memberIdFont: string
  positionPosition: { x: number; y: number }
  positionFont: string
  positionWidth: number
  positionAlign: CanvasTextAlign
  uploadedImagePosition: { x: number; y: number }
  uploadedImageSize: { width: number; height: number }
  expiryDate: string
  expiryPosition: { x: number; y: number }
  expiryFont: string
  qrCodePosition: { x: number; y: number }
  qrCodeSize: { width: number; height: number }
  qrCodeErrorCorrection: "L" | "M" | "Q" | "H"
  qrCodeMargin: number
  qrCodeModuleShape: "square" | "dots" | "fluid"
  qrCodeEyeShape: "square" | "circle"
  qrCodeCornerRadius: number
}

export default function IdSettings({
  memberData,
  onSettingsChange,
  uploadedImageUrl,
  onImageUpload,
  editableName,
  onNameChange,
  isNameInputEditable,
  uploadedImagePosition, // Destructure new prop
  onImagePositionChange, // Destructure new prop
}: IdSettingsProps) {
  // Detect mobile/tablet
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        "ontouchstart" in window ||
        window.innerWidth <= 1024 // Include tablets
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Calculate expiry date (6 months from now)
  const getExpiryDate = () => {
    const now = new Date()
    const expiry = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
    return expiry.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  // Hardcoded settings as per request
  const fixedSettings: Omit<
    IdSettings,
    | "uploadedImagePosition"
    | "uploadedImageSize"
    | "expiryDate"
    | "qrCodePosition"
    | "qrCodeSize"
    | "qrCodeErrorCorrection"
    | "qrCodeMargin"
    | "qrCodeModuleShape"
    | "qrCodeEyeShape"
    | "qrCodeCornerRadius"
  > = {
    position: "Salesperson",
    namePosition: { x: 525, y: 835 },
    nameFont: "71px Arial",
    nameWidth: 900,
    nameAlign: "center",
    memberIdPosition: { x: 352, y: 1435 },
    memberIdFont: "45px Arial",
    positionPosition: { x: 200, y: 510 },
    positionFont: "16px Arial",
    positionWidth: 250,
    positionAlign: "center",
    expiryPosition: { x: 515, y: 1448 },
    expiryFont: "50px Arial",
  }

  const [settings, setSettings] = useState<IdSettings>({
    ...fixedSettings,
    uploadedImagePosition: { x: 150, y: 200 },
    uploadedImageSize: { width: 200, height: 200 },
    expiryDate: getExpiryDate(),
    qrCodePosition: { x: 280, y: 865 },
    qrCodeSize: { width: 500, height: 500 },
    qrCodeErrorCorrection: "M",
    qrCodeMargin: 4,
    qrCodeModuleShape: "dots",
    qrCodeEyeShape: "circle",
    qrCodeCornerRadius: 10,
  })

  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const [photoScale, setPhotoScale] = useState(100)

  // Sync internal settings state with parent's onSettingsChange
  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const handleChange = (field: keyof IdSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleCoordinateChange = (
    field: "uploadedImagePosition" | "qrCodePosition",
    coord: "x" | "y",
    value: number,
  ) => {
    handleChange(field, { ...settings[field], [coord]: value })
  }

  const handleSizeChange = (
    field: "uploadedImageSize" | "qrCodeSize",
    dimension: "width" | "height",
    value: number,
  ) => {
    const newSize = { ...settings[field], [dimension]: value }
    handleChange(field, newSize)

    if (field === "uploadedImageSize" && dimension === "width" && originalImageSize) {
      const newScale = (value / originalImageSize.width) * 100
      setPhotoScale(Math.round(newScale))
    }
  }

  // Arrow control functions for mobile
  const moveImage = (direction: "up" | "down" | "left" | "right") => {
    const step = 10 // pixels to move per click
    const currentPos = uploadedImagePosition
    const newPosition = { ...currentPos }

    switch (direction) {
      case "up":
        newPosition.y = Math.max(0, currentPos.y - step)
        break
      case "down":
        newPosition.y = Math.min(1650 - uploadedImageSize.height, currentPos.y + step)
        break
      case "left":
        newPosition.x = Math.max(0, currentPos.x - step)
        break
      case "right":
        newPosition.x = Math.min(1050 - uploadedImageSize.width, currentPos.x + step)
        break
    }

    // Update both local settings and parent component
    handleChange("uploadedImagePosition", newPosition)
    if (onImagePositionChange) {
      onImagePositionChange(newPosition)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        const base64 = event.target?.result as string

        const img = new Image()
        img.onload = () => {
          const originalWidth = img.naturalWidth
          const originalHeight = img.naturalHeight

          const maxSize = 300
          const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight)
          const scaledWidth = originalWidth * scale
          const scaledHeight = originalHeight * scale

          setOriginalImageSize({ width: originalWidth, height: originalHeight })
          setPhotoScale(Math.round(scale * 100))

          handleChange("uploadedImageSize", { width: scaledWidth, height: scaledHeight })

          onImageUpload(base64)
        }
        img.src = base64
      }

      reader.readAsDataURL(file)
    } else {
      onImageUpload(null)
      setOriginalImageSize(null)
      setPhotoScale(100)
    }
  }

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = Number.parseInt(e.target.value)
    setPhotoScale(newScale)

    if (originalImageSize) {
      const scaleMultiplier = newScale / 100
      const newWidth = originalImageSize.width * scaleMultiplier
      const newHeight = originalImageSize.height * scaleMultiplier

      handleChange("uploadedImageSize", { width: newWidth, height: newHeight })
    }
  }

  const adjustScale = (increment: number) => {
    const newScale = Math.max(25, Math.min(500, photoScale + increment))
    setPhotoScale(newScale)

    if (originalImageSize) {
      const scaleMultiplier = newScale / 100
      const newWidth = originalImageSize.width * scaleMultiplier
      const newHeight = originalImageSize.height * scaleMultiplier

      handleChange("uploadedImageSize", { width: newWidth, height: newHeight })
    }
  }

  const resetImagePosition = () => {
    const resetPos = { x: 150, y: 200 }
    handleChange("uploadedImagePosition", resetPos)
    if (onImagePositionChange) {
      onImagePositionChange(resetPos)
    }

    if (originalImageSize) {
      const maxSize = 300
      const scale = Math.min(maxSize / originalImageSize.width, maxSize / originalImageSize.height)
      const scaledWidth = originalImageSize.width * scale
      const scaledHeight = originalImageSize.height * scale

      handleChange("uploadedImageSize", { width: scaledWidth, height: scaledHeight })
      setPhotoScale(Math.round(scale * 100))
    }
  }

  const { uploadedImageSize } = settings

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">ID Settings</h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Member Information</h3>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Member ID</label>
              <div className="bg-gray-100 p-2 rounded text-sm">{memberData.memberid}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={editableName}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={!isNameInputEditable}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Profile Image Upload & Settings</h3>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Upload Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm" />
            {uploadedImageUrl && (
              <div className="mt-2 text-xs text-gray-500">
                {isMobile
                  ? "Image uploaded. Use the arrow controls below to move the image."
                  : "Image uploaded. Click and drag on canvas to move the image."}
              </div>
            )}
          </div>

          {uploadedImageUrl && (
            <>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Photo Size: {photoScale}%</label>

                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => adjustScale(-5)}
                    className="flex-shrink-0 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-sm font-bold"
                    disabled={photoScale <= 25}
                  >
                    −
                  </button>

                  <input
                    type="range"
                    min="25"
                    max="500"
                    value={photoScale}
                    onChange={handleScaleChange}
                    className="flex-1"
                  />

                  <button
                    onClick={() => adjustScale(5)}
                    className="flex-shrink-0 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-sm font-bold"
                    disabled={photoScale >= 500}
                  >
                    +
                  </button>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>25%</span>
                  <span>500%</span>
                </div>
              </div>

              {/* Arrow Controls for Mobile/Tablet */}
              {isMobile && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">Move Image Position</label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto">
                      {/* Top row */}
                      <div></div>
                      <button
                        onClick={() => moveImage("up")}
                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center"
                        title="Move Up"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <div></div>

                      {/* Middle row */}
                      <button
                        onClick={() => moveImage("left")}
                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center"
                        title="Move Left"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </div>
                      <button
                        onClick={() => moveImage("right")}
                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center"
                        title="Move Right"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Bottom row */}
                      <div></div>
                      <button
                        onClick={() => moveImage("down")}
                        className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center"
                        title="Move Down"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div></div>
                    </div>

                    <div className="text-center mt-2">
                      <span className="text-xs text-gray-600">
                        Position: X:{Math.round(uploadedImagePosition.x)}, Y:{Math.round(uploadedImagePosition.y)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={resetImagePosition}
                className="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                Reset Position & Size
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
