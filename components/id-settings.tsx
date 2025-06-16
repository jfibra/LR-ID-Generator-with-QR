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
  isNameInputEditable: boolean // New prop for conditional name input
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
  qrCodeErrorCorrection: "L" | "M" | "Q" | "H" // QR Code Error Correction Level
  qrCodeMargin: number // Margin around QR code
  qrCodeModuleShape: "square" | "dots" | "fluid" // Update to include fluid
  qrCodeEyeShape: "square" | "circle" // Add back eye shape
  qrCodeCornerRadius: number // Add back corner radius
}

export default function IdSettings({
  memberData,
  onSettingsChange,
  uploadedImageUrl,
  onImageUpload,
  editableName,
  onNameChange,
  isNameInputEditable, // Destructure new prop
}: IdSettingsProps) {
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
    position: "Salesperson", // This can remain if needed for other purposes, but not used for text on canvas
    namePosition: { x: 525, y: 835 },
    nameFont: "71px Arial",
    nameWidth: 900,
    nameAlign: "center",
    memberIdPosition: { x: 352, y: 1435 },
    memberIdFont: "45px Arial",
    positionPosition: { x: 200, y: 510 }, // Not used for text on canvas
    positionFont: "16px Arial", // Not used for text on canvas
    positionWidth: 250, // Not used for text on canvas
    positionAlign: "center", // Not used for text on canvas
    expiryPosition: { x: 515, y: 1448 },
    expiryFont: "50px Arial",
  }

  const [settings, setSettings] = useState<IdSettings>({
    ...fixedSettings,
    uploadedImagePosition: { x: 150, y: 200 },
    uploadedImageSize: { width: 200, height: 200 },
    expiryDate: getExpiryDate(),
    qrCodePosition: { x: 280, y: 865 }, // Updated default position
    qrCodeSize: { width: 500, height: 500 }, // Updated default size
    qrCodeErrorCorrection: "M", // Updated to Medium
    qrCodeMargin: 4, // Default Margin
    qrCodeModuleShape: "dots", // Updated to dots
    qrCodeEyeShape: "circle", // Updated to circle
    qrCodeCornerRadius: 10, // Default corner radius for circle eyes
  })

  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const [photoScale, setPhotoScale] = useState(100) // Percentage scale

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

    // Update scale percentage based on width change for uploaded image
    if (field === "uploadedImageSize" && dimension === "width" && originalImageSize) {
      const newScale = (value / originalImageSize.width) * 100
      setPhotoScale(Math.round(newScale))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        const base64 = event.target?.result as string

        // Create image to get dimensions
        const img = new Image()
        img.onload = () => {
          const originalWidth = img.naturalWidth
          const originalHeight = img.naturalHeight

          // Auto-scale to 30% of canvas size (approximately)
          const maxSize = 300 // Max size for initial display
          const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight)
          const scaledWidth = originalWidth * scale
          const scaledHeight = originalHeight * scale

          setOriginalImageSize({ width: originalWidth, height: originalHeight })
          setPhotoScale(Math.round(scale * 100))

          // Update image size in settings
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

  // New function to handle +/- button clicks
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
    handleChange("uploadedImagePosition", { x: 150, y: 200 })
    if (originalImageSize) {
      const maxSize = 300
      const scale = Math.min(maxSize / originalImageSize.width, maxSize / originalImageSize.height)
      const scaledWidth = originalImageSize.width * scale
      const scaledHeight = originalImageSize.height * scale

      handleChange("uploadedImageSize", { width: scaledWidth, height: scaledHeight })
      setPhotoScale(Math.round(scale * 100))
    }
  }

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
                disabled={!isNameInputEditable} // Conditionally disable
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
                Image uploaded. On desktop: click and drag to move. On mobile: use touch controls in the canvas area.
              </div>
            )}
          </div>

          {uploadedImageUrl && (
            <>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">Photo Size: {photoScale}%</label>

                {/* Mobile-friendly controls with +/- buttons */}
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

              <button
                onClick={resetImagePosition}
                className="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                Reset Position & Size
              </button>
            </>
          )}
        </div>

        {/* QR Code Settings section removed as requested */}
      </div>
    </div>
  )
}
