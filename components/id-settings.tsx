"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { MemberData } from "@/types/api-types"

interface IdSettingsProps {
  memberData: MemberData
  onSettingsChange: (settings: IdSettings) => void
  uploadedImageUrl: string | null
  onImageUpload: (url: string | null) => void
  editableName: string
  onNameChange: (name: string) => void
  isNameInputEditable: boolean
  uploadedImagePosition: { x: number; y: number }
  onImagePositionChange?: (position: { x: number; y: number }) => void
  signatureImageUrl?: string | null
  onSignatureUpload?: (url: string | null) => void
  signaturePosition?: { x: number; y: number }
  onSignaturePositionChange?: (position: { x: number; y: number }) => void
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
  signaturePosition?: { x: number; y: number }
  signatureSize?: { width: number; height: number }
}

export default function IdSettings({
  memberData,
  onSettingsChange,
  uploadedImageUrl,
  onImageUpload,
  editableName,
  onNameChange,
  isNameInputEditable,
  uploadedImagePosition,
  onImagePositionChange,
  signatureImageUrl,
  onSignatureUpload,
  signaturePosition,
  onSignaturePositionChange,
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

  // Fixed settings as per original configuration
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
    | "signaturePosition"
    | "signatureSize"
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
    uploadedImagePosition: { x: 258, y: 255 },
    uploadedImageSize: { width: 520, height: 520 },
    expiryDate: getExpiryDate(),
    qrCodePosition: { x: 280, y: 865 },
    qrCodeSize: { width: 500, height: 500 },
    qrCodeErrorCorrection: "M",
    qrCodeMargin: 4,
    qrCodeModuleShape: "dots",
    qrCodeEyeShape: "circle",
    qrCodeCornerRadius: 10,
    signaturePosition: { x: 300, y: 120 },
    signatureSize: { width: 450, height: 130 },
  })

  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const [photoScale, setPhotoScale] = useState(100)
  const [signatureScale, setSignatureScale] = useState(100)
  const [signatureMode, setSignatureMode] = useState<"upload" | "draw">("upload")
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureApplied, setSignatureApplied] = useState(false)
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const handleChange = (field: keyof IdSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const moveImage = (direction: "up" | "down" | "left" | "right") => {
    const step = 20
    const currentPos = uploadedImagePosition
    const newPosition = { ...currentPos }

    switch (direction) {
      case "up":
        newPosition.y = currentPos.y - step
        break
      case "down":
        newPosition.y = currentPos.y + step
        break
      case "left":
        newPosition.x = currentPos.x - step
        break
      case "right":
        newPosition.x = currentPos.x + step
        break
    }

    handleChange("uploadedImagePosition", newPosition)
    if (onImagePositionChange) {
      onImagePositionChange(newPosition)
    }
  }

  const centerImage = () => {
    const width = settings.uploadedImageSize.width || 520
    const height = settings.uploadedImageSize.height || 520
    // Center at avatar cutout circle: center is (518, 515)
    const centeredPos = {
      x: Math.round(518 - width / 2),
      y: Math.round(515 - height / 2),
    }
    handleChange("uploadedImagePosition", centeredPos)
    if (onImagePositionChange) {
      onImagePositionChange(centeredPos)
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

          // Target aperture is 520px circle centered at (518, 515)
          const targetDiameter = 520
          const scale = Math.max(targetDiameter / originalWidth, targetDiameter / originalHeight)
          const scaledWidth = Math.round(originalWidth * scale)
          const scaledHeight = Math.round(originalHeight * scale)

          const centeredPos = {
            x: Math.round(518 - scaledWidth / 2),
            y: Math.round(515 - scaledHeight / 2),
          }

          setOriginalImageSize({ width: originalWidth, height: originalHeight })
          setPhotoScale(100)

          handleChange("uploadedImageSize", { width: scaledWidth, height: scaledHeight })
          handleChange("uploadedImagePosition", centeredPos)
          if (onImagePositionChange) {
            onImagePositionChange(centeredPos)
          }
          onImageUpload(base64)
        }
        img.src = base64
      }

      reader.readAsDataURL(file)
    }
  }

  const applyScale = (newScale: number) => {
    setPhotoScale(newScale)

    if (originalImageSize) {
      const targetDiameter = 550
      const baseScale = Math.max(targetDiameter / originalImageSize.width, targetDiameter / originalImageSize.height)
      const scaleMultiplier = (newScale / 100) * baseScale

      const newWidth = Math.round(originalImageSize.width * scaleMultiplier)
      const newHeight = Math.round(originalImageSize.height * scaleMultiplier)

      // Keep center stationary during scale
      const currentCenterX = uploadedImagePosition.x + settings.uploadedImageSize.width / 2
      const currentCenterY = uploadedImagePosition.y + settings.uploadedImageSize.height / 2

      const newPos = {
        x: Math.round(currentCenterX - newWidth / 2),
        y: Math.round(currentCenterY - newHeight / 2),
      }

      handleChange("uploadedImageSize", { width: newWidth, height: newHeight })
      handleChange("uploadedImagePosition", newPos)
      if (onImagePositionChange) {
        onImagePositionChange(newPos)
      }
    }
  }

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = Number.parseInt(e.target.value)
    applyScale(newScale)
  }

  const adjustScale = (increment: number) => {
    const newScale = Math.max(25, Math.min(500, photoScale + increment))
    applyScale(newScale)
  }

  const resetImagePosition = () => {
    if (originalImageSize) {
      const targetDiameter = 520
      const scale = Math.max(targetDiameter / originalImageSize.width, targetDiameter / originalImageSize.height)
      const scaledWidth = Math.round(originalImageSize.width * scale)
      const scaledHeight = Math.round(originalImageSize.height * scale)

      const centeredPos = {
        x: Math.round(518 - scaledWidth / 2),
        y: Math.round(515 - scaledHeight / 2),
      }

      handleChange("uploadedImagePosition", centeredPos)
      if (onImagePositionChange) {
        onImagePositionChange(centeredPos)
      }
      handleChange("uploadedImageSize", { width: scaledWidth, height: scaledHeight })
      setPhotoScale(100)
    } else {
      const resetPos = { x: 258, y: 255 }
      handleChange("uploadedImagePosition", resetPos)
      if (onImagePositionChange) {
        onImagePositionChange(resetPos)
      }
    }
  }

  // Signature handlers
  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onSignatureUpload) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        onSignatureUpload(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const moveSignature = (direction: "up" | "down" | "left" | "right") => {
    const step = 15
    const currentPos = signaturePosition || settings.signaturePosition || { x: 300, y: 120 }
    const newPos = { ...currentPos }

    switch (direction) {
      case "up":
        newPos.y -= step
        break
      case "down":
        newPos.y += step
        break
      case "left":
        newPos.x -= step
        break
      case "right":
        newPos.x += step
        break
    }

    handleChange("signaturePosition", newPos)
    if (onSignaturePositionChange) {
      onSignaturePositionChange(newPos)
    }
  }

  const resetSignaturePosition = () => {
    const defaultPos = { x: 300, y: 120 }
    handleChange("signaturePosition", defaultPos)
    if (onSignaturePositionChange) {
      onSignaturePositionChange(defaultPos)
    }
    setSignatureScale(100)
    handleChange("signatureSize", { width: 450, height: 130 })
  }

  const adjustSignatureScale = (increment: number) => {
    const newScale = Math.max(40, Math.min(200, signatureScale + increment))
    setSignatureScale(newScale)
    const baseW = 450
    const baseH = 130
    const mult = newScale / 100
    handleChange("signatureSize", {
      width: Math.round(baseW * mult),
      height: Math.round(baseH * mult),
    })
  }

  // Precise coordinate mapping scaling for signature drawing canvas
  const getSigCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } | null => {
    const canvas = sigCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      if (!e.touches || e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Scale precisely from displayed CSS bounding rect to internal canvas bitmap buffer
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  // Draw signature pad handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getSigCoordinates(e)
    if (!coords) return
    lastPointRef.current = coords
    setIsDrawing(true)

    // Draw initial dot for taps/single clicks
    const canvas = sigCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = "#003b64"
      ctx.fill()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current || !sigCanvasRef.current) return
    const coords = getSigCoordinates(e)
    if (!coords) return

    const canvas = sigCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.strokeStyle = "#003b64"
    ctx.lineWidth = 3.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()

    lastPointRef.current = coords
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPointRef.current = null
  }

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureApplied(false)
  }

  const applyDrawnSignature = () => {
    const canvas = sigCanvasRef.current
    if (!canvas || !onSignatureUpload) return
    const dataUrl = canvas.toDataURL("image/png")
    onSignatureUpload(dataUrl)
    setSignatureApplied(true)
    setTimeout(() => setSignatureApplied(false), 3000)
  }

  const activeSigPos = signaturePosition || settings.signaturePosition || { x: 300, y: 120 }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 h-full overflow-y-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-[#003b64]">ID Settings</h2>
        <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded-full border border-red-200">
          Agent Profile
        </span>
      </div>

      {/* Member Information */}
      <div>
        <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider mb-3">Member Information</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Member ID</label>
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-mono font-bold text-slate-800">
              {memberData.memberid}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={editableName}
              onChange={(e) => onNameChange(e.target.value)}
              className={`w-full p-2.5 border rounded-xl text-sm transition-all focus:outline-none ${
                isNameInputEditable
                  ? "bg-white border-blue-400 focus:ring-2 focus:ring-red-500 text-slate-800"
                  : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
              }`}
              disabled={!isNameInputEditable}
            />
            {!isNameInputEditable && (
              <p className="text-[11px] text-slate-400 mt-1">Official registered name</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Image Section */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider">Profile Photo (Front ID)</h3>
          {uploadedImageUrl && (
            <button
              onClick={() => {
                onImageUpload(null)
                setOriginalImageSize(null)
                setPhotoScale(100)
              }}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              Remove Photo
            </button>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Upload Portrait Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#003b64] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Tip: Click and drag directly on the card canvas to position your face in the circular window.
          </p>
        </div>

        {uploadedImageUrl && (
          <div className="space-y-4">
            {/* Zoom / Scale Control */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700">Photo Zoom</label>
                <span className="text-xs font-mono font-bold text-[#003b64]">{photoScale}%</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustScale(-5)}
                  className="w-8 h-8 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm"
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
                  className="flex-1 accent-red-600 cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => adjustScale(5)}
                  className="w-8 h-8 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm"
                  disabled={photoScale >= 500}
                >
                  +
                </button>
              </div>
            </div>

            {/* Position Nudge Pad */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">Position Nudge</label>
                <span className="text-[11px] font-mono text-slate-500">
                  X: {Math.round(uploadedImagePosition.x)} Y: {Math.round(uploadedImagePosition.y)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto my-2">
                <div></div>
                <button
                  type="button"
                  onClick={() => moveImage("up")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <div></div>

                <button
                  type="button"
                  onClick={() => moveImage("left")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={centerImage}
                  className="w-10 h-10 bg-[#003b64] hover:bg-[#002844] text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Auto-Center Photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => moveImage("right")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Right"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div></div>
                <button
                  type="button"
                  onClick={() => moveImage("down")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div></div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={centerImage}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#003b64] text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                >
                  Center Photo
                </button>
                <button
                  type="button"
                  onClick={resetImagePosition}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                >
                  Reset Zoom
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cardholder Signature Section (Back ID) */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider">Signature (Back ID)</h3>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-[#003b64] rounded border border-blue-200">
              New
            </span>
          </div>
          {signatureImageUrl && (
            <button
              onClick={() => onSignatureUpload?.(null)}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline"
            >
              Remove
            </button>
          )}
        </div>

        {/* Signature Mode Switcher */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3">
          <button
            type="button"
            onClick={() => setSignatureMode("upload")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              signatureMode === "upload"
                ? "bg-white text-[#003b64] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setSignatureMode("draw")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              signatureMode === "draw"
                ? "bg-white text-[#003b64] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Draw Signature
          </button>
        </div>

        {signatureMode === "upload" ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Upload Signature Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#003b64] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
            />
            <p className="text-[11px] text-slate-400 mt-1">Transparent PNG image recommended.</p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Sign in the box below:</label>
              {signatureApplied && (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-pulse">
                  ✓ Applied to Back Side
                </span>
              )}
            </div>
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-inner">
              <canvas
                ref={sigCanvasRef}
                width={560}
                height={224}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 touch-none cursor-crosshair bg-white"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={clearSignatureCanvas}
                className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyDrawnSignature}
                className="flex-1 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Apply Signature
              </button>
            </div>
          </div>
        )}

        {/* Signature Adjustments if Present */}
        {signatureImageUrl && (
          <div className="mt-4 space-y-4">
            {/* Signature Scale */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700">Signature Size</label>
                <span className="text-xs font-mono font-bold text-[#003b64]">{signatureScale}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustSignatureScale(-5)}
                  className="w-8 h-8 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm"
                  disabled={signatureScale <= 40}
                >
                  −
                </button>
                <input
                  type="range"
                  min="40"
                  max="200"
                  value={signatureScale}
                  onChange={(e) => {
                    const newScale = Number.parseInt(e.target.value)
                    setSignatureScale(newScale)
                    const baseW = 450
                    const baseH = 130
                    const mult = newScale / 100
                    handleChange("signatureSize", {
                      width: Math.round(baseW * mult),
                      height: Math.round(baseH * mult),
                    })
                  }}
                  className="flex-1 accent-red-600 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => adjustSignatureScale(5)}
                  className="w-8 h-8 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-700 shadow-sm"
                  disabled={signatureScale >= 200}
                >
                  +
                </button>
              </div>
            </div>

            {/* Signature Position Nudge */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">Position Signature</label>
                <span className="text-[11px] font-mono text-slate-500">
                  X: {Math.round(activeSigPos.x)} Y: {Math.round(activeSigPos.y)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 max-w-[150px] mx-auto my-2">
                <div></div>
                <button
                  type="button"
                  onClick={() => moveSignature("up")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <div></div>

                <button
                  type="button"
                  onClick={() => moveSignature("left")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>

                <button
                  type="button"
                  onClick={() => moveSignature("right")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Right"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div></div>
                <button
                  type="button"
                  onClick={() => moveSignature("down")}
                  className="w-10 h-10 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  title="Move Down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div></div>
              </div>

              <button
                type="button"
                onClick={resetSignaturePosition}
                className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors mt-2"
              >
                Reset Signature Position
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
