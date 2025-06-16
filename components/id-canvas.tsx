"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MemberData } from "@/types/api-types"
import QRCodeRenderer from "./qr-code-renderer"

interface ImageEntry {
  photo?: string // base64 data
  photoPosition?: {
    x: number
    y: number
    width: number
    height: number
  }
  originalPhotoSize?: {
    width: number
    height: number
  }
}

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
}

export default function IdCanvas({
  memberData,
  position,
  isFront,
  namePosition,
  nameFont,
  nameWidth,
  nameAlign,
  memberIdPosition,
  memberIdFont,
  positionPosition,
  positionFont,
  positionWidth,
  positionAlign,
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
  onImageSizeChange,
  isImageSelected,
  onImageSelectedChange,
}: IdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [imageEntry, setImageEntry] = useState<ImageEntry>({})
  const [qrCanvas, setQrCanvas] = useState<HTMLCanvasElement | null>(null)
  const dprRef = useRef(1)

  // Cache for loaded images to prevent re-loading
  const uploadedImageRef = useRef<HTMLImageElement | null>(null)
  const idImageRef = useRef<HTMLImageElement | null>(null)

  // Mobile-specific throttling
  const isMobileRef = useRef(false)
  const lastMobileUpdateRef = useRef(0)
  const mobileAnimationFrameRef = useRef<number | null>(null)
  const pendingMobilePositionRef = useRef<{ x: number; y: number } | null>(null)

  // Canvas dimensions based on actual ID card size (in pixels)
  const CANVAS_WIDTH = 1050
  const CANVAS_HEIGHT = 1650

  // Detect if device is mobile
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
    // Use the actual canvas dimensions for scaling
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const isPointInImage = useCallback(
    (x: number, y: number) => {
      if (!uploadedImageUrl) return false
      // Use logical coordinates, not scaled by DPR
      return (
        x >= uploadedImagePosition.x &&
        x <= uploadedImagePosition.x + uploadedImageSize.width &&
        y >= uploadedImagePosition.y &&
        y <= uploadedImagePosition.y + uploadedImageSize.height
      )
    },
    [uploadedImageUrl, uploadedImagePosition, uploadedImageSize],
  )

  const isPointInCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const rect = canvas.getBoundingClientRect()
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }, [])

  // Mobile-optimized position update with throttling
  const updatePositionMobile = useCallback(
    (newPosition: { x: number; y: number }) => {
      pendingMobilePositionRef.current = newPosition

      if (mobileAnimationFrameRef.current) {
        return // Already scheduled
      }

      mobileAnimationFrameRef.current = requestAnimationFrame(() => {
        const now = Date.now()
        if (now - lastMobileUpdateRef.current >= 32) {
          // ~30fps for mobile
          if (pendingMobilePositionRef.current && onImagePositionChange) {
            onImagePositionChange(pendingMobilePositionRef.current)
            lastMobileUpdateRef.current = now
          }
        }
        mobileAnimationFrameRef.current = null
      })
    },
    [onImagePositionChange],
  )

  // Desktop position update (immediate)
  const updatePositionDesktop = useCallback(
    (newPosition: { x: number; y: number }) => {
      if (onImagePositionChange) {
        onImagePositionChange(newPosition)
      }
    },
    [onImagePositionChange],
  )

  // Mouse event handlers (Desktop)
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!uploadedImageUrl) return

      const coords = getCanvasCoordinates(e.clientX, e.clientY)

      if (isPointInImage(coords.x, coords.y)) {
        setIsDragging(true)
        onImageSelectedChange(true)
        setDragOffset({
          x: coords.x - uploadedImagePosition.x,
          y: coords.y - uploadedImagePosition.y,
        })
        e.preventDefault()
      } else if (isPointInCanvas(e.clientX, e.clientY)) {
        // Only deselect if clicking inside canvas but outside image
        onImageSelectedChange(false)
      }
    },
    [
      uploadedImageUrl,
      getCanvasCoordinates,
      isPointInImage,
      isPointInCanvas,
      uploadedImagePosition,
      onImageSelectedChange,
    ],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas || !uploadedImageUrl) return

      const coords = getCanvasCoordinates(e.clientX, e.clientY)

      if (isPointInImage(coords.x, coords.y)) {
        canvas.style.cursor = "move"
      } else {
        canvas.style.cursor = "default"
      }

      if (isDragging) {
        const newPosition = {
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y,
        }
        // Desktop gets immediate updates
        updatePositionDesktop(newPosition)
      }
    },
    [uploadedImageUrl, getCanvasCoordinates, isPointInImage, isDragging, dragOffset, updatePositionDesktop],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch event handlers (Mobile) - improved
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!uploadedImageUrl || e.touches.length !== 1) return

      const touch = e.touches[0]
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY)

      console.log("Touch start:", {
        touchCoords: { x: touch.clientX, y: touch.clientY },
        canvasCoords: coords,
        imagePos: uploadedImagePosition,
        imageSize: uploadedImageSize,
        isInImage: isPointInImage(coords.x, coords.y),
        isInCanvas: isPointInCanvas(touch.clientX, touch.clientY),
      })

      if (isPointInImage(coords.x, coords.y)) {
        setIsDragging(true)
        onImageSelectedChange(true)
        setDragOffset({
          x: coords.x - uploadedImagePosition.x,
          y: coords.y - uploadedImagePosition.y,
        })
        e.preventDefault()
        e.stopPropagation()
      } else if (isPointInCanvas(touch.clientX, touch.clientY)) {
        // Only deselect if touching inside canvas but outside image
        onImageSelectedChange(false)
        e.preventDefault()
      }
    },
    [
      uploadedImageUrl,
      getCanvasCoordinates,
      isPointInImage,
      isPointInCanvas,
      uploadedImagePosition,
      onImageSelectedChange,
    ],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!uploadedImageUrl || !isDragging || e.touches.length !== 1) return

      const touch = e.touches[0]
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY)

      const newPosition = {
        x: coords.x - dragOffset.x,
        y: coords.y - dragOffset.y,
      }

      console.log("Touch move:", {
        touchCoords: { x: touch.clientX, y: touch.clientY },
        canvasCoords: coords,
        newPosition,
        dragOffset,
      })

      // Mobile gets throttled updates
      updatePositionMobile(newPosition)
      e.preventDefault()
      e.stopPropagation()
    },
    [uploadedImageUrl, isDragging, getCanvasCoordinates, dragOffset, updatePositionMobile],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      console.log("Touch end, was dragging:", isDragging)
      setIsDragging(false)
      e.preventDefault()
    },
    [isDragging],
  )

  // Global click handler to handle clicks outside canvas
  const handleGlobalClick = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const target = e.target as Element

      // Check if the click/touch is outside the entire canvas container
      if (!container.contains(target)) {
        onImageSelectedChange(false)
      }
    },
    [onImageSelectedChange],
  )

  // Event listeners setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Mouse events (Desktop)
    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e)
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
    const mouseUpHandler = () => handleMouseUp()

    // Touch events (Mobile)
    const touchStartHandler = (e: TouchEvent) => handleTouchStart(e)
    const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e)
    const touchEndHandler = (e: TouchEvent) => handleTouchEnd(e)

    // Global click/touch handlers
    const globalClickHandler = (e: MouseEvent) => handleGlobalClick(e)
    const globalTouchHandler = (e: TouchEvent) => handleGlobalClick(e)

    // Add canvas-specific event listeners
    canvas.addEventListener("mousedown", mouseDownHandler)
    canvas.addEventListener("touchstart", touchStartHandler, { passive: false })
    canvas.addEventListener("touchmove", touchMoveHandler, { passive: false })
    canvas.addEventListener("touchend", touchEndHandler, { passive: false })

    // Add document-level event listeners
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)
    document.addEventListener("click", globalClickHandler, true) // Use capture phase
    document.addEventListener("touchend", globalTouchHandler, true) // Use capture phase

    return () => {
      // Clean up mobile animation frame
      if (mobileAnimationFrameRef.current) {
        cancelAnimationFrame(mobileAnimationFrameRef.current)
      }

      // Remove canvas event listeners
      canvas.removeEventListener("mousedown", mouseDownHandler)
      canvas.removeEventListener("touchstart", touchStartHandler)
      canvas.removeEventListener("touchmove", touchMoveHandler)
      canvas.removeEventListener("touchend", touchEndHandler)

      // Remove document event listeners
      document.removeEventListener("mousemove", mouseMoveHandler)
      document.removeEventListener("mouseup", mouseUpHandler)
      document.removeEventListener("click", globalClickHandler, true)
      document.removeEventListener("touchend", globalTouchHandler, true)
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

  // Optimized image loading with caching
  const loadImages = useCallback(async () => {
    const promises: Promise<void>[] = []

    // Load uploaded image if needed
    if (uploadedImageUrl && (!uploadedImageRef.current || uploadedImageRef.current.src !== uploadedImageUrl)) {
      const uploadedImgPromise = new Promise<void>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          uploadedImageRef.current = img
          if (!imageEntry.originalPhotoSize) {
            setImageEntry((prev) => ({
              ...prev,
              originalPhotoSize: {
                width: img.naturalWidth,
                height: img.naturalHeight,
              },
            }))
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
    }

    // Load ID background if needed
    const idImageSrc = isFront ? "/images/front-id.png" : "/images/back-id.png"
    if (!idImageRef.current || idImageRef.current.src.includes(idImageSrc) === false) {
      const idImgPromise = new Promise<void>((resolve, reject) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          idImageRef.current = img
          resolve()
        }
        img.onerror = () => {
          console.error("Failed to load ID background image")
          reject()
        }
        img.src = idImageSrc
      })
      promises.push(idImgPromise)
    }

    await Promise.all(promises)
  }, [uploadedImageUrl, isFront, imageEntry.originalPhotoSize])

  // Fixed canvas drawing with proper responsive sizing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    const rect = canvas.getBoundingClientRect()

    // Set canvas internal size with device pixel ratio for crisp rendering
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr

    // Set canvas display size to maintain responsive behavior
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    // Scale the drawing context to match the device pixel ratio
    ctx.scale(dpr, dpr)

    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw uploaded image BEHIND the background (if available and cached)
    if (uploadedImageRef.current && isFront) {
      ctx.drawImage(
        uploadedImageRef.current,
        uploadedImagePosition.x,
        uploadedImagePosition.y,
        uploadedImageSize.width,
        uploadedImageSize.height,
      )
    }

    // Draw ID background on top (if cached)
    if (idImageRef.current) {
      ctx.drawImage(idImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }

    // If showing front, draw text elements on top
    if (isFront) {
      // Draw name
      const baseNameFontSize = Number.parseInt(nameFont)
      const fittingNameFontSize = getFittingFontSize(ctx, editableName, nameWidth, baseNameFontSize, true)
      ctx.font = `bold ${fittingNameFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = nameAlign
      ctx.fillText(editableName, namePosition.x, namePosition.y)

      // Draw member ID
      const baseMemberIdFontSize = Number.parseInt(memberIdFont)
      ctx.font = `bold ${baseMemberIdFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = "left"
      ctx.fillText(memberData.memberid.toString(), memberIdPosition.x, memberIdPosition.y)

      // Draw QR Code if available
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, qrCodePosition.x, qrCodePosition.y, qrCodeSize.width, qrCodeSize.height)
      }

      // Draw selection border around image if selected
      if (uploadedImageRef.current && isImageSelected) {
        ctx.strokeStyle = "#007bff"
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
      // Back ID - draw expiry date
      const baseExpiryFontSize = Number.parseInt(expiryFont)
      ctx.font = `bold ${baseExpiryFontSize}px Arial`
      ctx.fillStyle = "#003b64"
      ctx.textAlign = "left"
      ctx.fillText(expiryDate, expiryPosition.x, expiryPosition.y)
    }
  }, [
    memberData,
    isFront,
    namePosition,
    nameFont,
    nameWidth,
    nameAlign,
    memberIdPosition,
    memberIdFont,
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
  ])

  // Main effect for loading and drawing
  useEffect(() => {
    const loadAndDraw = async () => {
      setIsLoading(true)
      try {
        await loadImages()
        drawCanvas()
      } catch (error) {
        console.error("Error rendering ID:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAndDraw()
  }, [loadImages, drawCanvas])

  // Separate effect for position changes during dragging (no loading state)
  useEffect(() => {
    if (!isLoading && (uploadedImageRef.current || idImageRef.current)) {
      drawCanvas()
    }
  }, [uploadedImagePosition, drawCanvas, isLoading])

  const qrCodeContent = memberData.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto rounded-lg shadow-lg border touch-none select-none"
        style={{
          maxWidth: "100%",
          height: "auto",
          // Optimize for mobile performance during dragging
          willChange: isDragging && isMobileRef.current ? "transform" : "auto",
        }}
      />

      {/* QR Code Renderer - hidden but generates the QR code canvas */}
      {isFront && qrCodeContent && (
        <QRCodeRenderer
          value={qrCodeContent}
          size={qrCodeSize.width}
          fgColor="#003b64"
          bgColor="#FFFFFF00"
          qrStyle={qrCodeModuleShape}
          eyeShape={qrCodeEyeShape}
          cornerRadius={qrCodeCornerRadius}
          errorCorrectionLevel={qrCodeErrorCorrection}
          margin={qrCodeMargin}
          onCanvasReady={handleQRCanvasReady}
          key={`${qrCodeSize.width}-${qrCodeSize.height}-${qrCodeModuleShape}-${qrCodeEyeShape}-${qrCodeCornerRadius}-${qrCodeErrorCorrection}-${qrCodeMargin}`}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="w-12 h-12">
            <svg
              className="animate-spin w-full h-full text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        </div>
      )}
      {uploadedImageUrl && isImageSelected && (
        <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
          Drag to move • Touch to move on mobile • Click outside to deselect
        </div>
      )}
    </div>
  )
}
