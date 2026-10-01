"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import QRCodeRenderer from "@/components/qr-code-renderer"
import type { MemberData } from "@/types/api-types"

interface IdCanvasProps {
  memberData: MemberData
  position: string
  isFront: boolean
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
  uploadedImageUrl: string | null
  uploadedImagePosition: { x: number; y: number }
  uploadedImageSize: { width: number; height: number }
  editableName: string
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
  onImagePositionChange?: (position: { x: number; y: number }) => void
  onImageSizeChange?: (size: { width: number; height: number }) => void
  isImageSelected: boolean
  onImageSelectedChange: (selected: boolean) => void
  signatureImageUrl?: string | null
  signaturePosition?: { x: number; y: number }
  signatureSize?: { width: number; height: number }
  onSignaturePositionChange?: (position: { x: number; y: number }) => void
  isSignatureSelected?: boolean
  onSignatureSelectedChange?: (selected: boolean) => void
}

export default function IdCanvas({
  memberData,
  isFront,
  namePosition,
  nameFont,
  nameWidth,
  nameAlign,
  memberIdPosition,
  memberIdFont,
  uploadedImageUrl,
  uploadedImagePosition,
  uploadedImageSize,
  editableName,
  expiryDate,
  expiryPosition,
  expiryFont,
  qrCodePosition,
  qrCodeSize,
  qrCodeErrorCorrection,
  qrCodeMargin,
  qrCodeModuleShape,
  qrCodeEyeShape,
  qrCodeCornerRadius,
  onImagePositionChange,
  isImageSelected,
  onImageSelectedChange,
  signatureImageUrl,
  signaturePosition = { x: 300, y: 120 },
  signatureSize = { width: 450, height: 130 },
  onSignaturePositionChange,
  isSignatureSelected = false,
  onSignatureSelectedChange,
}: IdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragTargetRef = useRef<"profile" | "signature" | null>(null)
  const originalPhotoSizeRef = useRef<{ width: number; height: number } | null>(null)
  const [qrCanvas, setQrCanvas] = useState<HTMLCanvasElement | null>(null)
  const dprRef = useRef(1)

  // Cache for loaded images in memory
  const uploadedImageRef = useRef<HTMLImageElement | null>(null)
  const frontImageRef = useRef<HTMLImageElement | null>(null)
  const backImageRef = useRef<HTMLImageElement | null>(null)
  const signatureImageRef = useRef<HTMLImageElement | null>(null)

  // Mobile check
  const isMobileRef = useRef(false)

  const CANVAS_WIDTH = 1050
  const CANVAS_HEIGHT = 1650

  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        "ontouchstart" in window ||
        window.innerWidth <= 768
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  // Check if click is inside the uploaded image or circular avatar aperture
  const isPointInProfileImage = useCallback(
    (x: number, y: number) => {
      if (!uploadedImageUrl) return false
      // In image bounding box
      const inBox =
        x >= uploadedImagePosition.x &&
        x <= uploadedImagePosition.x + uploadedImageSize.width &&
        y >= uploadedImagePosition.y &&
        y <= uploadedImagePosition.y + uploadedImageSize.height
      // OR in avatar aperture circle: center (518, 515), radius 260
      const inCircle = Math.hypot(x - 518, y - 515) <= 260
      return inBox || inCircle
    },
    [uploadedImageUrl, uploadedImagePosition, uploadedImageSize],
  )

  // Check if click is inside signature bounding box
  const isPointInSignature = useCallback(
    (x: number, y: number) => {
      if (!signatureImageUrl) return false
      const sigX = signaturePosition.x
      const sigY = signaturePosition.y
      const sigW = signatureSize.width
      const sigH = signatureSize.height
      return x >= sigX && x <= sigX + sigW && y >= sigY && y <= sigY + sigH
    },
    [signatureImageUrl, signaturePosition, signatureSize],
  )

  const isPointInCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const rect = canvas.getBoundingClientRect()
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }, [])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY)

      if (isFront) {
        if (uploadedImageUrl && isPointInProfileImage(coords.x, coords.y)) {
          setIsDragging(true)
          dragTargetRef.current = "profile"
          onImageSelectedChange(true)
          setDragOffset({
            x: coords.x - uploadedImagePosition.x,
            y: coords.y - uploadedImagePosition.y,
          })
          e.preventDefault()
        } else if (isPointInCanvas(e.clientX, e.clientY)) {
          onImageSelectedChange(false)
        }
      } else {
        if (signatureImageUrl && isPointInSignature(coords.x, coords.y)) {
          setIsDragging(true)
          dragTargetRef.current = "signature"
          onSignatureSelectedChange?.(true)
          setDragOffset({
            x: coords.x - signaturePosition.x,
            y: coords.y - signaturePosition.y,
          })
          e.preventDefault()
        } else if (isPointInCanvas(e.clientX, e.clientY)) {
          onSignatureSelectedChange?.(false)
        }
      }
    },
    [
      isFront,
      uploadedImageUrl,
      signatureImageUrl,
      getCanvasCoordinates,
      isPointInProfileImage,
      isPointInSignature,
      isPointInCanvas,
      uploadedImagePosition,
      signaturePosition,
      onImageSelectedChange,
      onSignatureSelectedChange,
    ],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const coords = getCanvasCoordinates(e.clientX, e.clientY)

      if (isFront) {
        if (uploadedImageUrl && isPointInProfileImage(coords.x, coords.y)) {
          canvas.style.cursor = isDragging ? "grabbing" : "grab"
        } else {
          canvas.style.cursor = "default"
        }
      } else {
        if (signatureImageUrl && isPointInSignature(coords.x, coords.y)) {
          canvas.style.cursor = isDragging ? "grabbing" : "grab"
        } else {
          canvas.style.cursor = "default"
        }
      }

      if (isDragging) {
        if (dragTargetRef.current === "profile" && onImagePositionChange) {
          const newPosition = {
            x: Math.round(coords.x - dragOffset.x),
            y: Math.round(coords.y - dragOffset.y),
          }
          onImagePositionChange(newPosition)
        } else if (dragTargetRef.current === "signature" && onSignaturePositionChange) {
          const newPosition = {
            x: Math.round(coords.x - dragOffset.x),
            y: Math.round(coords.y - dragOffset.y),
          }
          onSignaturePositionChange(newPosition)
        }
      }
    },
    [
      isFront,
      uploadedImageUrl,
      signatureImageUrl,
      getCanvasCoordinates,
      isPointInProfileImage,
      isPointInSignature,
      isDragging,
      dragOffset,
      onImagePositionChange,
      onSignaturePositionChange,
    ],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragTargetRef.current = null
  }, [])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY)

      if (isFront) {
        if (uploadedImageUrl && isPointInProfileImage(coords.x, coords.y)) {
          setIsDragging(true)
          dragTargetRef.current = "profile"
          onImageSelectedChange(true)
          setDragOffset({
            x: coords.x - uploadedImagePosition.x,
            y: coords.y - uploadedImagePosition.y,
          })
          e.preventDefault()
          e.stopPropagation()
        } else if (isPointInCanvas(touch.clientX, touch.clientY)) {
          onImageSelectedChange(false)
        }
      } else {
        if (signatureImageUrl && isPointInSignature(coords.x, coords.y)) {
          setIsDragging(true)
          dragTargetRef.current = "signature"
          onSignatureSelectedChange?.(true)
          setDragOffset({
            x: coords.x - signaturePosition.x,
            y: coords.y - signaturePosition.y,
          })
          e.preventDefault()
          e.stopPropagation()
        } else if (isPointInCanvas(touch.clientX, touch.clientY)) {
          onSignatureSelectedChange?.(false)
        }
      }
    },
    [
      isFront,
      uploadedImageUrl,
      signatureImageUrl,
      getCanvasCoordinates,
      isPointInProfileImage,
      isPointInSignature,
      isPointInCanvas,
      uploadedImagePosition,
      signaturePosition,
      onImageSelectedChange,
      onSignatureSelectedChange,
    ],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return

      const touch = e.touches[0]
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY)

      if (dragTargetRef.current === "profile" && onImagePositionChange) {
        const newPosition = {
          x: Math.round(coords.x - dragOffset.x),
          y: Math.round(coords.y - dragOffset.y),
        }
        onImagePositionChange(newPosition)
      } else if (dragTargetRef.current === "signature" && onSignaturePositionChange) {
        const newPosition = {
          x: Math.round(coords.x - dragOffset.x),
          y: Math.round(coords.y - dragOffset.y),
        }
        onSignaturePositionChange(newPosition)
      }

      e.preventDefault()
      e.stopPropagation()
    },
    [isDragging, getCanvasCoordinates, dragOffset, onImagePositionChange, onSignaturePositionChange],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragTargetRef.current = null
  }, [])

  const handleGlobalClick = useCallback(
    (e: MouseEvent) => {
      if (isPointInCanvas(e.clientX, e.clientY)) {
        return
      }
      const target = e.target as HTMLElement
      if (target.closest(".id-settings") || target.closest("button") || target.closest("input")) {
        return
      }
      onImageSelectedChange(false)
      onSignatureSelectedChange?.(false)
    },
    [isPointInCanvas, onImageSelectedChange, onSignatureSelectedChange],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e)
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
    const mouseUpHandler = () => handleMouseUp()
    const touchStartHandler = (e: TouchEvent) => handleTouchStart(e)
    const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e)
    const touchEndHandler = () => handleTouchEnd()
    const globalClickHandler = (e: MouseEvent) => handleGlobalClick(e)

    canvas.addEventListener("mousedown", mouseDownHandler)
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)
    canvas.addEventListener("touchstart", touchStartHandler, { passive: false })
    canvas.addEventListener("touchmove", touchMoveHandler, { passive: false })
    canvas.addEventListener("touchend", touchEndHandler, { passive: false })
    document.addEventListener("click", globalClickHandler, true)

    return () => {
      canvas.removeEventListener("mousedown", mouseDownHandler)
      document.removeEventListener("mousemove", mouseMoveHandler)
      document.removeEventListener("mouseup", mouseUpHandler)
      canvas.removeEventListener("touchstart", touchStartHandler)
      canvas.removeEventListener("touchmove", touchMoveHandler)
      canvas.removeEventListener("touchend", touchEndHandler)
      document.removeEventListener("click", globalClickHandler, true)
    }
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleGlobalClick,
  ])

  const getFittingFontSize = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    baseFontSize: number,
    isBold = false,
  ): number => {
    let fontSize = baseFontSize
    ctx.font = `${isBold ? "bold " : ""}${fontSize}px Arial`

    while (ctx.measureText(text).width > maxWidth && fontSize > 8) {
      fontSize -= 1
      ctx.font = `${isBold ? "bold " : ""}${fontSize}px Arial`
    }

    return fontSize
  }

  const handleQRCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setQrCanvas(canvas)
  }, [])

  const loadImages = useCallback(async () => {
    const promises: Promise<void>[] = []

    if (uploadedImageUrl && (!uploadedImageRef.current || uploadedImageRef.current.src !== uploadedImageUrl)) {
      const uploadedImgPromise = new Promise<void>((resolve) => {
        const img = new window.Image()
        if (!uploadedImageUrl.startsWith("data:") && !uploadedImageUrl.startsWith("blob:")) {
          img.crossOrigin = "anonymous"
        }
        img.onload = () => {
          uploadedImageRef.current = img
          originalPhotoSizeRef.current = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          }
          resolve()
        }
        img.onerror = () => {
          console.error("Failed to load uploaded image")
          uploadedImageRef.current = null
          resolve()
        }
        img.src = uploadedImageUrl
      })
      promises.push(uploadedImgPromise)
    } else if (!uploadedImageUrl) {
      uploadedImageRef.current = null
    }

    if (signatureImageUrl && (!signatureImageRef.current || signatureImageRef.current.src !== signatureImageUrl)) {
      const sigPromise = new Promise<void>((resolve) => {
        const img = new window.Image()
        if (!signatureImageUrl.startsWith("data:") && !signatureImageUrl.startsWith("blob:")) {
          img.crossOrigin = "anonymous"
        }
        img.onload = () => {
          signatureImageRef.current = img
          resolve()
        }
        img.onerror = () => {
          console.error("Failed to load signature image")
          signatureImageRef.current = null
          resolve()
        }
        img.src = signatureImageUrl
      })
      promises.push(sigPromise)
    } else if (!signatureImageUrl) {
      signatureImageRef.current = null
    }

    if (!frontImageRef.current) {
      const frontPromise = new Promise<void>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          frontImageRef.current = img
          resolve()
        }
        img.onerror = () => resolve()
        img.src = "/images/front-id.png"
      })
      promises.push(frontPromise)
    }

    if (!backImageRef.current) {
      const backPromise = new Promise<void>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          backImageRef.current = img
          resolve()
        }
        img.onerror = () => resolve()
        img.src = "/images/back-id.png"
      })
      promises.push(backPromise)
    }

    await Promise.all(promises)
  }, [uploadedImageUrl, signatureImageUrl])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = dprRef.current || 1

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (uploadedImageRef.current && isFront) {
      ctx.drawImage(
        uploadedImageRef.current,
        uploadedImagePosition.x,
        uploadedImagePosition.y,
        uploadedImageSize.width,
        uploadedImageSize.height,
      )
    }

    const bgImage = isFront ? frontImageRef.current : backImageRef.current
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    if (isFront) {
      const baseNameFontSize = Number.parseInt(nameFont)
      const fittingNameFontSize = getFittingFontSize(ctx, editableName, nameWidth, baseNameFontSize, true)
      ctx.font = `bold ${fittingNameFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = nameAlign
      ctx.fillText(editableName, namePosition.x, namePosition.y)

      const baseMemberIdFontSize = Number.parseInt(memberIdFont)
      ctx.font = `bold ${baseMemberIdFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = "left"
      ctx.fillText(memberData.memberid.toString(), memberIdPosition.x, memberIdPosition.y)

      if (qrCanvas) {
        ctx.drawImage(qrCanvas, qrCodePosition.x, qrCodePosition.y, qrCodeSize.width, qrCodeSize.height)
      }

      if (uploadedImageRef.current && isImageSelected) {
        ctx.strokeStyle = "#dc2626"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(
          uploadedImagePosition.x,
          uploadedImagePosition.y,
          uploadedImageSize.width,
          uploadedImageSize.height,
        )
        ctx.setLineDash([])
      }
    } else {
      const baseExpiryFontSize = Number.parseInt(expiryFont)
      ctx.font = `bold ${baseExpiryFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = "left"
      ctx.fillText(expiryDate, expiryPosition.x, expiryPosition.y)

      // Draw signature on back of card
      if (signatureImageRef.current) {
        ctx.drawImage(
          signatureImageRef.current,
          signaturePosition.x,
          signaturePosition.y,
          signatureSize.width,
          signatureSize.height,
        )

        if (isSignatureSelected) {
          ctx.strokeStyle = "#dc2626"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(
            signaturePosition.x,
            signaturePosition.y,
            signatureSize.width,
            signatureSize.height,
          )
          ctx.setLineDash([])
        }
      }
    }

    ctx.restore()
  }, [
    memberData,
    isFront,
    namePosition,
    nameFont,
    nameWidth,
    nameAlign,
    memberIdPosition,
    memberIdFont,
    uploadedImageUrl,
    uploadedImagePosition,
    uploadedImageSize,
    editableName,
    isImageSelected,
    expiryDate,
    expiryPosition,
    expiryFont,
    qrCanvas,
    qrCodePosition,
    qrCodeSize,
    signatureImageUrl,
    signaturePosition,
    signatureSize,
    isSignatureSelected,
  ])

  // Set internal canvas resolution once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
  }, [])

  // Asset loading when URL or side changes
  useEffect(() => {
    let isMounted = true
    const initImages = async () => {
      try {
        await loadImages()
        if (isMounted) {
          setIsLoading(false)
          drawCanvas()
        }
      } catch (error) {
        console.error("Error loading images:", error)
        if (isMounted) {
          setIsLoading(false)
          drawCanvas()
        }
      }
    }

    initImages()
    return () => {
      isMounted = false
    }
  }, [loadImages, drawCanvas])

  // Fast redraw whenever visual properties change
  useEffect(() => {
    if (!isLoading) {
      drawCanvas()
    }
  }, [drawCanvas, isLoading])

  const qrCodeContent = memberData.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto rounded-xl shadow-lg border border-slate-200 touch-none select-none bg-white"
        style={{
          maxWidth: "100%",
          height: "auto",
        }}
      />

      {isFront && qrCodeContent && (
        <QRCodeRenderer
          value={qrCodeContent}
          size={qrCodeSize.width}
          fgColor="#003b64"
          bgColor="#FFFFFF00"
          qrStyle={qrCodeModuleShape === "square" ? "squares" : qrCodeModuleShape}
          eyeShape={qrCodeEyeShape}
          cornerRadius={qrCodeCornerRadius}
          errorCorrectionLevel={qrCodeErrorCorrection}
          margin={qrCodeMargin}
          onCanvasReady={handleQRCanvasReady}
          key={`${qrCodeSize.width}-${qrCodeSize.height}-${qrCodeModuleShape}-${qrCodeEyeShape}-${qrCodeCornerRadius}-${qrCodeErrorCorrection}-${qrCodeMargin}`}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-xl">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isFront && uploadedImageUrl && isImageSelected && (
        <div className="absolute top-2 right-2 bg-[#003b64] text-white text-[11px] px-2.5 py-1 rounded-lg shadow-md font-medium">
          Drag to move photo • Click outside to deselect
        </div>
      )}

      {!isFront && signatureImageUrl && isSignatureSelected && (
        <div className="absolute top-2 right-2 bg-[#003b64] text-white text-[11px] px-2.5 py-1 rounded-lg shadow-md font-medium">
          Drag to move signature • Click outside to deselect
        </div>
      )}
    </div>
  )
}
