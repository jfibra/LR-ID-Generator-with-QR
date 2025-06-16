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
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [imageEntry, setImageEntry] = useState<ImageEntry>({})
  const [qrCanvas, setQrCanvas] = useState<HTMLCanvasElement | null>(null)
  const dprRef = useRef(1)

  // Canvas dimensions based on actual ID card size (in pixels)
  const CANVAS_WIDTH = 1050
  const CANVAS_HEIGHT = 1650

  const getCanvasCoordinates = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const isPointInImage = useCallback(
    (x: number, y: number) => {
      if (!uploadedImageUrl) return false
      const dpr = dprRef.current
      return (
        x >= uploadedImagePosition.x * dpr &&
        x <= (uploadedImagePosition.x + uploadedImageSize.width) * dpr &&
        y >= uploadedImagePosition.y * dpr &&
        y <= (uploadedImagePosition.y + uploadedImageSize.height) * dpr
      )
    },
    [uploadedImageUrl, uploadedImagePosition, uploadedImageSize],
  )

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!uploadedImageUrl) return

      const coords = getCanvasCoordinates(e)

      if (isPointInImage(coords.x, coords.y)) {
        setIsDragging(true)
        onImageSelectedChange(true)
        setDragOffset({
          x: coords.x / dprRef.current - uploadedImagePosition.x,
          y: coords.y / dprRef.current - uploadedImagePosition.y,
        })
        e.preventDefault()
      } else {
        onImageSelectedChange(false)
      }
    },
    [uploadedImageUrl, getCanvasCoordinates, isPointInImage, uploadedImagePosition, onImageSelectedChange],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas || !uploadedImageUrl) return

      const coords = getCanvasCoordinates(e)

      if (isPointInImage(coords.x, coords.y)) {
        canvas.style.cursor = "move"
      } else {
        canvas.style.cursor = "default"
      }

      if (isDragging) {
        const newPosition = {
          x: coords.x / dprRef.current - dragOffset.x,
          y: coords.y / dprRef.current - dragOffset.y,
        }
        onImagePositionChange?.(newPosition)
      }
    },
    [uploadedImageUrl, getCanvasCoordinates, isPointInImage, isDragging, dragOffset, onImagePositionChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e)
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
    const mouseUpHandler = () => handleMouseUp()

    canvas.addEventListener("mousedown", mouseDownHandler)
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)

    return () => {
      canvas.removeEventListener("mousedown", mouseDownHandler)
      document.removeEventListener("mousemove", mouseMoveHandler)
      document.removeEventListener("mouseup", mouseUpHandler)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

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

  // Main canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    const rect = canvas.getBoundingClientRect()

    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const loadImagesAndDraw = async () => {
      setIsLoading(true)

      try {
        // Load uploaded image first (to draw behind background)
        let uploadedImg: HTMLImageElement | null = null
        if (uploadedImageUrl) {
          uploadedImg = new window.Image()
          uploadedImg.crossOrigin = "anonymous"
          uploadedImg.src = uploadedImageUrl

          await new Promise((resolve) => {
            uploadedImg!.onload = () => {
              if (!imageEntry.originalPhotoSize) {
                setImageEntry((prev) => ({
                  ...prev,
                  originalPhotoSize: {
                    width: uploadedImg!.naturalWidth,
                    height: uploadedImg!.naturalHeight,
                  },
                }))
              }
              resolve(null)
            }
            uploadedImg!.onerror = () => {
              console.error("Failed to load uploaded image")
              resolve(null)
            }
          })
        }

        // Load ID background image (front or back)
        const idImage = new window.Image()
        idImage.crossOrigin = "anonymous"
        idImage.src = isFront ? "/images/front-id.png" : "/images/back-id.png"

        await new Promise((resolve, reject) => {
          idImage.onload = resolve
          idImage.onerror = reject
        })

        // Draw uploaded image BEHIND the background (if available)
        if (uploadedImg && isFront) {
          ctx.drawImage(
            uploadedImg,
            uploadedImagePosition.x,
            uploadedImagePosition.y,
            uploadedImageSize.width,
            uploadedImageSize.height,
          )
        }

        // Draw ID background on top
        ctx.drawImage(idImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

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
          if (uploadedImg && isImageSelected) {
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
      } catch (error) {
        console.error("Error rendering ID:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadImagesAndDraw()
  }, [
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
    imageEntry.originalPhotoSize,
    isImageSelected,
    expiryDate,
    expiryPosition,
    expiryFont,
    qrCanvas, // Add qrCanvas as dependency
    qrCodePosition, // Add QR code position
    qrCodeSize, // Add QR code size
    qrCodeModuleShape, // Add module shape
    qrCodeEyeShape, // Add eye shape
    qrCodeCornerRadius, // Add corner radius
    qrCodeErrorCorrection, // Add error correction
    qrCodeMargin, // Add margin
  ])

  const qrCodeContent = memberData.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto rounded-lg shadow-lg border"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      {/* QR Code Renderer - hidden but generates the QR code canvas */}
      {isFront && qrCodeContent && (
        <QRCodeRenderer
          value={qrCodeContent}
          size={qrCodeSize.width}
          fgColor="#003b64"
          bgColor="#FFFFFF00"
          qrStyle={qrCodeModuleShape} // Pass qrStyle directly
          eyeShape={qrCodeEyeShape} // Pass eyeShape directly
          cornerRadius={qrCodeCornerRadius} // Pass cornerRadius directly
          errorCorrectionLevel={qrCodeErrorCorrection}
          margin={qrCodeMargin}
          onCanvasReady={handleQRCanvasReady}
          // Add a key prop to force re-render when settings change
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
          Drag to move • Click outside to deselect
        </div>
      )}
    </div>
  )
}
