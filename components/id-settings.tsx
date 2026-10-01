"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { MemberData } from "@/types/api-types"
import {
  Maximize2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  PenTool,
  Upload,
  Check,
  X,
  Camera,
  Move,
  ZoomIn,
  ZoomOut,
  Target,
  Sparkles,
} from "lucide-react"

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
  initialOpenModal?: "photo" | "signature" | null
  onCloseInitialModal?: () => void
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
  initialOpenModal,
  onCloseInitialModal,
}: IdSettingsProps) {
  // Compute expiry date 1 year from now
  const getExpiryDate = () => {
    const today = new Date()
    const nextYear = new Date(today.setFullYear(today.getFullYear() + 1))
    const day = String(nextYear.getDate()).padStart(2, "0")
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    const month = months[nextYear.getMonth()]
    const year = nextYear.getFullYear()
    return `${day}-${month}-${year}`
  }

  const fixedSettings = {
    position: "Marketing Director",
    namePosition: { x: 525, y: 885 },
    nameFont: "bold 44px Arial",
    nameWidth: 700,
    nameAlign: "center" as CanvasTextAlign,
    memberIdPosition: { x: 525, y: 965 },
    memberIdFont: "bold 36px Arial",
    positionPosition: { x: 200, y: 510 },
    positionFont: "16px Arial",
    positionWidth: 250,
    positionAlign: "center" as CanvasTextAlign,
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

  // Mobile Touch Expand States
  const [photoSectionExpanded, setPhotoSectionExpanded] = useState(true)
  const [sigSectionExpanded, setSigSectionExpanded] = useState(true)
  const [showPhotoTouchModal, setShowPhotoTouchModal] = useState(false)
  const [showSigTouchModal, setShowSigTouchModal] = useState(false)

  // Touch Expand Signature Pad refs
  const touchSigCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [touchSigPenWidth, setTouchSigPenWidth] = useState<number>(4)
  const isTouchSigDrawing = useRef(false)
  const lastTouchSigPoint = useRef<{ x: number; y: number } | null>(null)

  // Touch Modal Photo Drag & Pinch refs
  const photoTouchStartPos = useRef<{ x: number; y: number } | null>(null)
  const photoTouchStartImagePos = useRef<{ x: number; y: number } | null>(null)
  const photoInitialPinchDist = useRef<number | null>(null)
  const photoInitialPinchScale = useRef<number>(100)

  // Trigger from outside (e.g. mobile preview tab shortcut)
  useEffect(() => {
    if (initialOpenModal === "photo") {
      setShowPhotoTouchModal(true)
      onCloseInitialModal?.()
    } else if (initialOpenModal === "signature") {
      setShowSigTouchModal(true)
      onCloseInitialModal?.()
    }
  }, [initialOpenModal, onCloseInitialModal])

  // Prevent background scroll when touch modal is open
  useEffect(() => {
    if (showPhotoTouchModal || showSigTouchModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [showPhotoTouchModal, showSigTouchModal])

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

  // Precise coordinate mapping scaling for standard signature drawing canvas
  const getSigCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = sigCanvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX
        clientY = e.changedTouches[0].clientY
      } else {
        return null
      }
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e) {
      e.stopPropagation()
    }
    const coords = getSigCoordinates(e)
    if (!coords) return

    lastPointRef.current = coords
    setIsDrawing(true)

    // Draw initial dot for taps
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

  // --- TOUCH EXPAND: Fullscreen Signature Canvas Helpers ---
  const getTouchModalSigCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX
        clientY = e.changedTouches[0].clientY
      } else {
        return null
      }
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startTouchModalDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = touchSigCanvasRef.current
    if (!canvas) return
    const coords = getTouchModalSigCoords(e, canvas)
    if (!coords) return

    lastTouchSigPoint.current = coords
    isTouchSigDrawing.current = true

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, touchSigPenWidth / 2, 0, Math.PI * 2)
      ctx.fillStyle = "#003b64"
      ctx.fill()
    }
  }

  const drawTouchModal = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTouchSigDrawing.current || !lastTouchSigPoint.current || !touchSigCanvasRef.current) return
    const canvas = touchSigCanvasRef.current
    const coords = getTouchModalSigCoords(e, canvas)
    if (!coords) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastTouchSigPoint.current.x, lastTouchSigPoint.current.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.strokeStyle = "#003b64"
    ctx.lineWidth = touchSigPenWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()

    lastTouchSigPoint.current = coords
  }

  const stopTouchModalDrawing = () => {
    isTouchSigDrawing.current = false
    lastTouchSigPoint.current = null
  }

  const clearTouchModalCanvas = () => {
    const canvas = touchSigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const applyTouchModalSignature = () => {
    const canvas = touchSigCanvasRef.current
    if (!canvas || !onSignatureUpload) return
    const dataUrl = canvas.toDataURL("image/png")
    onSignatureUpload(dataUrl)
    setSignatureApplied(true)
    setShowSigTouchModal(false)
    setTimeout(() => setSignatureApplied(false), 3000)
  }

  // --- TOUCH EXPAND: Photo Touch Gestures (Drag & Pinch) ---
  const MODAL_CIRCLE_DIAMETER = 260 // Viewport circle size in px
  const CANVAS_APERTURE_DIAMETER = 520 // Canvas aperture size in px
  const photoRatio = MODAL_CIRCLE_DIAMETER / CANVAS_APERTURE_DIAMETER

  const handlePhotoTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      photoTouchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      photoTouchStartImagePos.current = { ...uploadedImagePosition }
      photoInitialPinchDist.current = null
    } else if (e.touches.length === 2) {
      photoTouchStartPos.current = null
      photoInitialPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      photoInitialPinchScale.current = photoScale
    }
  }

  const handlePhotoTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && photoTouchStartPos.current && photoTouchStartImagePos.current) {
      const deltaX = (e.touches[0].clientX - photoTouchStartPos.current.x) / photoRatio
      const deltaY = (e.touches[0].clientY - photoTouchStartPos.current.y) / photoRatio

      const newPos = {
        x: Math.round(photoTouchStartImagePos.current.x + deltaX),
        y: Math.round(photoTouchStartImagePos.current.y + deltaY),
      }
      handleChange("uploadedImagePosition", newPos)
      onImagePositionChange?.(newPos)
    } else if (e.touches.length === 2 && photoInitialPinchDist.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      const ratio = currentDist / photoInitialPinchDist.current
      const newScale = Math.round(Math.max(25, Math.min(500, photoInitialPinchScale.current * ratio)))
      applyScale(newScale)
    }
  }

  const handlePhotoTouchEnd = () => {
    photoTouchStartPos.current = null
    photoInitialPinchDist.current = null
  }

  const activeSigPos = signaturePosition || settings.signaturePosition || { x: 300, y: 120 }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 h-full overflow-y-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-[#003b64]">ID Settings</h2>
          <p className="text-[11px] text-slate-500">Configure portrait photo & cardholder signature</p>
        </div>
        <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 rounded-full border border-red-200">
          Official ID
        </span>
      </div>

      {/* Member Information */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
        <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Member Information</span>
          <span className="text-[10px] text-slate-400 font-normal">Verified System Data</span>
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Member ID</label>
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-800">
              {memberData.memberid}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={editableName}
              onChange={(e) => onNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-xs transition-all focus:outline-none ${
                isNameInputEditable
                  ? "bg-white border-blue-400 focus:ring-2 focus:ring-red-500 text-slate-800"
                  : "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
              }`}
              disabled={!isNameInputEditable}
            />
            {!isNameInputEditable && (
              <p className="text-[10px] text-slate-400 mt-1">Official registered name</p>
            )}
          </div>
        </div>
      </div>

      {/* PROFILE IMAGE SECTION (Touch-Expandable) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all">
        {/* Section Header (Touch to Expand) */}
        <button
          type="button"
          onClick={() => setPhotoSectionExpanded((prev) => !prev)}
          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors active:bg-blue-50"
        >
          <div className="flex items-center gap-2.5">
            {uploadedImageUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#003b64] shrink-0 bg-white shadow-sm">
                <img src={uploadedImageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#003b64] flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider">Profile Photo</h3>
                <span className="text-[10px] font-semibold text-slate-500">(Front Side)</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {uploadedImageUrl ? "Tap to edit photo position & zoom" : "Touch to expand photo upload"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {uploadedImageUrl ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Added
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                Required
              </span>
            )}
            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              {photoSectionExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </button>

        {/* Section Body */}
        {photoSectionExpanded && (
          <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Upload Portrait Photo</label>
              {uploadedImageUrl && (
                <button
                  type="button"
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

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#003b64] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
            />

            {uploadedImageUrl && (
              <>
                {/* Touch Expand Action Banner for Mobile */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#003b64] text-white flex items-center justify-center shadow-sm">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#003b64]">Touch Expand Editor</p>
                      <p className="text-[10px] text-slate-500">Touch drag & pinch-to-zoom on mobile</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoTouchModal(true)}
                    className="px-3 py-1.5 bg-[#003b64] hover:bg-[#002844] text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>Expand</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline Zoom / Scale Control */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
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

                {/* Inline Position Nudge Pad */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">Position Nudge</label>
                    <span className="text-[10px] font-mono text-slate-500">
                      X: {Math.round(uploadedImagePosition.x)} Y: {Math.round(uploadedImagePosition.y)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 max-w-[140px] mx-auto my-2">
                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveImage("up")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <div></div>

                    <button
                      type="button"
                      onClick={() => moveImage("left")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={centerImage}
                      className="w-9 h-9 bg-[#003b64] hover:bg-[#002844] text-white rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Auto-Center Photo"
                    >
                      <Target className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveImage("right")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Right"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveImage("down")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Down"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div></div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={centerImage}
                      className="flex-1 py-1 px-2 bg-blue-50 hover:bg-blue-100 text-[#003b64] text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                    >
                      Center Photo
                    </button>
                    <button
                      type="button"
                      onClick={resetImagePosition}
                      className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
                    >
                      Reset Zoom
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* SIGNATURE SECTION (Touch-Expandable) */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all">
        {/* Section Header (Touch to Expand) */}
        <button
          type="button"
          onClick={() => setSigSectionExpanded((prev) => !prev)}
          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors active:bg-blue-50"
        >
          <div className="flex items-center gap-2.5">
            {signatureImageUrl ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-[#003b64] bg-white flex items-center justify-center shrink-0 shadow-sm p-0.5">
                <img src={signatureImageUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#003b64] flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#003b64] uppercase tracking-wider">Cardholder Signature</h3>
                <span className="text-[10px] font-semibold text-slate-500">(Back Side)</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {signatureImageUrl ? "Signature active • Tap to adjust" : "Touch to expand drawing pad or upload"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {signatureImageUrl ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Signed
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full">
                Optional
              </span>
            )}
            <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              {sigSectionExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </button>

        {/* Section Body */}
        {sigSectionExpanded && (
          <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between">
              {/* Signature Mode Switcher */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl flex-1 max-w-[220px]">
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-all ${
                    signatureMode === "upload"
                      ? "bg-white text-[#003b64] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded-lg transition-all ${
                    signatureMode === "draw"
                      ? "bg-white text-[#003b64] shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Draw Signature
                </button>
              </div>

              {signatureImageUrl && (
                <button
                  type="button"
                  onClick={() => onSignatureUpload?.(null)}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline ml-2"
                >
                  Remove
                </button>
              )}
            </div>

            {signatureMode === "upload" ? (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#003b64] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
                />
                <p className="text-[10px] text-slate-400">Transparent PNG image recommended for best card look.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Touch Expand Action Banner for Signature */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#003b64] text-white flex items-center justify-center shadow-sm">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#003b64]">Touch Expand Signature Pad</p>
                      <p className="text-[10px] text-slate-500">Generous finger drawing space on mobile</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSigTouchModal(true)}
                    className="px-3 py-1.5 bg-[#003b64] hover:bg-[#002844] text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <span>Expand</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Draw signature in the box:</label>
                    {signatureApplied && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-pulse">
                        ✓ Applied
                      </span>
                    )}
                  </div>
                  <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-inner relative group">
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
                    <button
                      type="button"
                      onClick={() => setShowSigTouchModal(true)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-slate-600 hover:text-[#003b64] rounded-lg shadow border border-slate-200 text-[10px] flex items-center gap-1 font-semibold"
                      title="Touch Expand Drawing Pad"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand Pad</span>
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
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
              </div>
            )}

            {/* Signature Scale and Nudge Controls if Present */}
            {signatureImageUrl && (
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                {/* Signature Scale */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-1.5">
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
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">Position Signature</label>
                    <span className="text-[10px] font-mono text-slate-500">
                      X: {Math.round(activeSigPos.x)} Y: {Math.round(activeSigPos.y)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 max-w-[140px] mx-auto my-2">
                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveSignature("up")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <div></div>

                    <button
                      type="button"
                      onClick={() => moveSignature("left")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                      <PenTool className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <button
                      type="button"
                      onClick={() => moveSignature("right")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Right"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div></div>
                    <button
                      type="button"
                      onClick={() => moveSignature("down")}
                      className="w-9 h-9 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      title="Move Down"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div></div>
                  </div>

                  <button
                    type="button"
                    onClick={resetSignaturePosition}
                    className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors mt-1"
                  >
                    Reset Signature Position
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TOUCH EXPAND PROFILE PHOTO MODAL */}
      {/* ========================================================================= */}
      {showPhotoTouchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[95vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#003b64] to-[#00223a] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Touch Expand: Profile Photo</h3>
                  <p className="text-[11px] text-blue-200">1-finger drag to position • 2-finger pinch to zoom</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoTouchModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {uploadedImageUrl ? (
                <>
                  {/* Interactive Touch Viewport (Circular ID Aperture representation) */}
                  <div className="flex flex-col items-center">
                    <div
                      className="relative w-[260px] h-[260px] rounded-full overflow-hidden border-4 border-[#003b64] shadow-2xl bg-slate-900 touch-none select-none cursor-move flex items-center justify-center group"
                      onTouchStart={handlePhotoTouchStart}
                      onTouchMove={handlePhotoTouchMove}
                      onTouchEnd={handlePhotoTouchEnd}
                    >
                      {/* Image under aperture */}
                      <img
                        src={uploadedImageUrl}
                        alt="Photo positioning"
                        draggable={false}
                        style={{
                          position: "absolute",
                          left: `${(uploadedImagePosition.x - (518 - 260)) * photoRatio}px`,
                          top: `${(uploadedImagePosition.y - (515 - 260)) * photoRatio}px`,
                          width: `${settings.uploadedImageSize.width * photoRatio}px`,
                          height: `${settings.uploadedImageSize.height * photoRatio}px`,
                          maxWidth: "none",
                          maxHeight: "none",
                          pointerEvents: "none",
                        }}
                      />

                      {/* Aperture Crosshair Overlay */}
                      <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full">
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
                      </div>

                      <div className="absolute bottom-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2.5 py-0.5 rounded-full pointer-events-none font-medium flex items-center gap-1 border border-white/10">
                        <Move className="w-3 h-3" />
                        Drag with finger
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-2 text-center">
                      Live Preview inside circular ID card cutout
                    </p>
                  </div>

                  {/* Zoom Controls */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-[#003b64]" />
                        Zoom Scale
                      </span>
                      <span className="font-mono font-bold text-[#003b64] bg-white px-2 py-0.5 rounded border border-slate-200">
                        {photoScale}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => adjustScale(-5)}
                        className="w-11 h-11 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm active:scale-95"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min="25"
                        max="500"
                        value={photoScale}
                        onChange={handleScaleChange}
                        className="flex-1 accent-red-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => adjustScale(5)}
                        className="w-11 h-11 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-lg font-bold text-slate-700 shadow-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Direct Directional Nudge (Large 48px touch targets) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-[#003b64]" />
                        Directional Nudge
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        X: {Math.round(uploadedImagePosition.x)} Y: {Math.round(uploadedImagePosition.y)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-w-[170px] mx-auto my-1">
                      <div></div>
                      <button
                        type="button"
                        onClick={() => moveImage("up")}
                        className="w-12 h-12 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                        title="Up"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <div></div>

                      <button
                        type="button"
                        onClick={() => moveImage("left")}
                        className="w-12 h-12 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                        title="Left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={centerImage}
                        className="w-12 h-12 bg-[#003b64] hover:bg-[#002844] text-white rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                        title="Center"
                      >
                        <Target className="w-5 h-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage("right")}
                        className="w-12 h-12 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                        title="Right"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div></div>
                      <button
                        type="button"
                        onClick={() => moveImage("down")}
                        className="w-12 h-12 bg-white hover:bg-blue-50 text-[#003b64] border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all"
                        title="Down"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div></div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={centerImage}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-[#003b64] text-xs font-bold rounded-xl border border-blue-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Target className="w-3.5 h-3.5" />
                        Auto-Center
                      </button>
                      <button
                        type="button"
                        onClick={resetImagePosition}
                        className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Zoom
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-[#003b64] flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Photo Uploaded Yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Please upload your portrait photo first to use the touch expand editor.
                  </p>
                  <label className="inline-block cursor-pointer px-4 py-2.5 bg-[#003b64] hover:bg-[#002844] text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all">
                    Choose Photo File
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">Live preview auto-syncs</span>
              <button
                type="button"
                onClick={() => setShowPhotoTouchModal(false)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Done & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TOUCH EXPAND SIGNATURE PAD MODAL */}
      {/* ========================================================================= */}
      {showSigTouchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[95vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#003b64] to-[#00223a] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Touch Expand: Signature Pad</h3>
                  <p className="text-[11px] text-blue-200">Sign comfortably with your finger or stylus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSigTouchModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Pen Thickness:</span>
                  <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTouchSigPenWidth(3)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        touchSigPenWidth === 3 ? "bg-white text-[#003b64] shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Fine
                    </button>
                    <button
                      type="button"
                      onClick={() => setTouchSigPenWidth(4.5)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        touchSigPenWidth === 4.5 ? "bg-white text-[#003b64] shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => setTouchSigPenWidth(6.5)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        touchSigPenWidth === 6.5 ? "bg-white text-[#003b64] shadow-sm font-bold" : "text-slate-600"
                      }`}
                    >
                      Bold
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearTouchModalCanvas}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>

              {/* Large Touch Canvas */}
              <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-inner relative touch-none select-none">
                <canvas
                  ref={touchSigCanvasRef}
                  width={700}
                  height={320}
                  onMouseDown={startTouchModalDrawing}
                  onMouseMove={drawTouchModal}
                  onMouseUp={stopTouchModalDrawing}
                  onMouseLeave={stopTouchModalDrawing}
                  onTouchStart={startTouchModalDrawing}
                  onTouchMove={drawTouchModal}
                  onTouchEnd={stopTouchModalDrawing}
                  className="w-full h-56 sm:h-64 touch-none cursor-crosshair bg-white"
                />

                {/* Subtle Signature Guideline */}
                <div className="absolute left-6 right-6 bottom-12 border-b-2 border-dashed border-slate-200 pointer-events-none flex justify-between items-center text-[10px] text-slate-300 px-1">
                  <span>Sign on the line</span>
                  <span>Cardholder Signature</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#003b64] shrink-0 mt-0.5" />
                <span>
                  Tip: Rotate your phone to landscape mode for an even wider signature drawing area!
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowSigTouchModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyTouchModalSignature}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Back ID</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
