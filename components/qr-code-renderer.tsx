"use client"

import { useEffect, useRef, useState } from "react"
import { QRCode } from "react-qrcode-logo"

interface QRCodeRendererProps {
  value: string
  size: number
  bgColor?: string
  fgColor?: string
  qrStyle?: "squares" | "dots" | "fluid"
  eyeShape?: "square" | "circle" // Use eyeShape directly
  cornerRadius?: number // Use cornerRadius for eyeRadius when eyeShape is circle
  errorCorrectionLevel?: "L" | "M" | "Q" | "H"
  margin?: number
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

export default function QRCodeRenderer({
  value,
  size,
  bgColor = "#FFFFFF00",
  fgColor = "#003b64",
  qrStyle = "squares",
  eyeShape = "square", // Default to square
  cornerRadius = 0, // Default to 0
  errorCorrectionLevel = "H",
  margin = 4,
  onCanvasReady,
}: QRCodeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderKey, setRenderKey] = useState(0)

  // Determine eyeRadius based on eyeShape and cornerRadius
  const calculatedEyeRadius = eyeShape === "circle" ? cornerRadius : 0

  useEffect(() => {
    // Force re-render when any prop changes
    setRenderKey((prev) => prev + 1)
  }, [value, size, bgColor, fgColor, qrStyle, calculatedEyeRadius, errorCorrectionLevel, margin])

  useEffect(() => {
    if (!containerRef.current || !value) return

    const timer = setTimeout(() => {
      // Find the canvas element created by QRCode component
      const canvas = containerRef.current?.querySelector("canvas")
      if (canvas && onCanvasReady) {
        onCanvasReady(canvas)
      }
    }, 200) // Increased delay to ensure QR code is fully rendered

    return () => clearTimeout(timer)
  }, [renderKey, onCanvasReady])

  return (
    <div ref={containerRef} style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      <QRCode
        key={renderKey} // Force component re-render
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        qrStyle={qrStyle}
        // Pass calculatedEyeRadius directly to eyeRadius prop
        eyeRadius={calculatedEyeRadius}
        ecLevel={errorCorrectionLevel}
        quietZone={margin}
        enableCORS={true}
      />
    </div>
  )
}
