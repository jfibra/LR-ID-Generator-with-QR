"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image" // This imports the Next.js Image component
import type { MemberData } from "@/types/api-types"
import IdSettings from "@/components/id-settings"
import type { IdSettings as IdSettingsType } from "@/components/id-settings"
import IdCanvas from "@/components/id-canvas"
import QRCodeRenderer from "@/components/qr-code-renderer"

export default function IdGenerator() {
  const router = useRouter()
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [editableName, setEditableName] = useState<string>("")
  const [isImageSelected, setIsImageSelected] = useState(false) // New state for image selection
  const [isFront, setIsFront] = useState(true) // New state to track which side is being displayed
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [hasLoggedAccess, setHasLoggedAccess] = useState(false) // Track if we've already logged access

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

  // Updated default settings as requested
  const [settings, setSettings] = useState<IdSettingsType>({
    position: "Salesperson",
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
    uploadedImagePosition: { x: 150, y: 200 },
    uploadedImageSize: { width: 200, height: 200 },
    expiryDate: getExpiryDate(),
    expiryPosition: { x: 515, y: 1448 },
    expiryFont: "50px Arial",
    qrCodePosition: { x: 280, y: 865 }, // Updated default position
    qrCodeSize: { width: 500, height: 500 }, // Updated default size
    qrCodeErrorCorrection: "M", // Updated to Medium
    qrCodeMargin: 4, // Default Margin
    qrCodeModuleShape: "dots", // Updated to dots
    qrCodeEyeShape: "circle", // Updated to circle
    qrCodeCornerRadius: 10, // Default corner radius for circle eyes
  })

  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [downloadQrCanvas, setDownloadQrCanvas] = useState<HTMLCanvasElement | null>(null)

  // Function to log ID generation activities
  const logIdGeneration = useCallback(
    async (action: "access" | "front_download" | "back_download") => {
      if (!memberData) return

      try {
        await fetch("/api/log-id-generation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId: memberData.memberid,
            email: memberData.email,
            firstName: memberData.fn,
            middleName: memberData.mn,
            lastName: memberData.ln,
            completeName: memberData.completename,
            memberType: memberData.membertype,
            status: memberData.status,
            sessionId,
            action,
          }),
        })
      } catch (error) {
        console.error("Failed to log ID generation:", error)
      }
    },
    [memberData, sessionId],
  )

  useEffect(() => {
    // Retrieve the data from sessionStorage
    const storedData = sessionStorage.getItem("memberData")

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setMemberData(parsedData)

        // Fix the name display - only use first name and last name
        const displayName = `${parsedData.fn} ${parsedData.ln}`.trim()
        setEditableName(displayName)

        // Log the access to ID generator only once
        if (!hasLoggedAccess) {
          setHasLoggedAccess(true)
          // Use setTimeout to avoid blocking the render
          setTimeout(() => {
            logIdGeneration("access")
          }, 100)
        }
      } catch (error) {
        console.error("Error parsing member data:", error)
      }
    } else {
      // If no data is found, redirect back to the home page
      router.push("/")
    }

    setLoading(false)
  }, [router]) // Removed logIdGeneration from dependencies to prevent re-renders

  const handleSettingsChange = useCallback((newSettings: IdSettingsType) => {
    setSettings((prev) => ({
      ...prev,
      uploadedImagePosition: newSettings.uploadedImagePosition,
      uploadedImageSize: newSettings.uploadedImageSize,
      expiryDate: newSettings.expiryDate,
      qrCodePosition: newSettings.qrCodePosition,
      qrCodeSize: newSettings.qrCodeSize,
      qrCodeErrorCorrection: newSettings.qrCodeErrorCorrection, // Update new prop
      qrCodeMargin: newSettings.qrCodeMargin, // Update new prop
      qrCodeModuleShape: newSettings.qrCodeModuleShape, // Add this line
      qrCodeEyeShape: newSettings.qrCodeEyeShape, // Add this line
      qrCodeCornerRadius: newSettings.qrCodeCornerRadius, // Add this line
    }))
  }, [])

  const handleImageUpload = useCallback((url: string | null) => {
    setUploadedImageUrl(url)
    if (url) {
      setIsImageSelected(true) // Automatically select image on upload
    } else {
      setIsImageSelected(false)
    }
  }, [])

  const handleNameChange = useCallback(
    (name: string) => {
      // Only update editableName if the input is enabled
      const originalName = memberData?.completename || ""
      if (originalName.includes("&") || originalName.includes("And") || originalName.includes("and")) {
        setEditableName(name)
      }
    },
    [memberData],
  )

  const handleImagePositionChange = useCallback((position: { x: number; y: number }) => {
    setSettings((prev) => ({
      ...prev,
      uploadedImagePosition: position,
    }))
  }, [])

  const handleImageSizeChange = useCallback((size: { width: number; height: number }) => {
    setSettings((prev) => ({
      ...prev,
      uploadedImageSize: size,
    }))
  }, [])

  const handleImageSelectedChange = useCallback((selected: boolean) => {
    setIsImageSelected(selected)
  }, [])

  // Callback to receive the QR code canvas for download
  const handleDownloadQRCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setDownloadQrCanvas(canvas)
  }, [])

  const handleDownload = async (isFront: boolean) => {
    // Log the download attempt
    logIdGeneration(isFront ? "front_download" : "back_download")

    // Create a temporary canvas for high-resolution export
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx || !memberData) return

    const dpr = window.devicePixelRatio || 1 // Get DPR for download canvas as well

    // Set high resolution for export (actual ID dimensions, scaled by DPR)
    const exportWidth = 1050
    const exportHeight = 1650
    tempCanvas.width = exportWidth * dpr // Scale canvas drawing buffer
    tempCanvas.height = exportHeight * dpr // Scale canvas drawing buffer

    tempCtx.scale(dpr, dpr) // Apply DPR scaling to context

    // Function to calculate font size that fits within width limit (duplicated for download context)
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

    try {
      // Load uploaded image first (if available and front)
      let uploadedImg: HTMLImageElement | null = null
      if (uploadedImageUrl && isFront) {
        uploadedImg = new window.Image() // Use window.Image to avoid conflict with Next.js Image component
        uploadedImg.crossOrigin = "anonymous"
        uploadedImg.src = uploadedImageUrl
        await new Promise((resolve) => {
          uploadedImg!.onload = resolve
          uploadedImg!.onerror = resolve // Resolve even on error to prevent hanging
        })
      }

      // Load ID background
      const idImage = new window.Image() // Use window.Image to avoid conflict with Next.js Image component
      idImage.crossOrigin = "anonymous"
      idImage.src = isFront ? "/images/front-id.png" : "/images/back-id.png"
      await new Promise((resolve) => {
        idImage.onload = resolve
        idImage.onerror = resolve // Resolve even on error to prevent hanging
      })

      // Draw uploaded image behind background (if front)
      if (uploadedImg && isFront) {
        tempCtx.drawImage(
          uploadedImg,
          settings.uploadedImagePosition.x,
          settings.uploadedImagePosition.y,
          settings.uploadedImageSize.width,
          settings.uploadedImageSize.height,
        )
      }

      // Draw ID background
      tempCtx.drawImage(idImage, 0, 0, exportWidth, exportHeight)

      // Draw text elements
      if (isFront) {
        // Name (bold, auto-fitting) - use settings position
        const baseNameFontSize = Number.parseInt(settings.nameFont)
        const fittingNameFontSize = getFittingFontSize(
          tempCtx,
          editableName,
          settings.nameWidth,
          baseNameFontSize,
          true,
        )
        tempCtx.font = `bold ${fittingNameFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = settings.nameAlign
        tempCtx.fillText(editableName, settings.namePosition.x, settings.namePosition.y)

        // Member ID - use settings position and font, make bold
        const baseMemberIdFontSize = Number.parseInt(settings.memberIdFont)
        tempCtx.font = `bold ${baseMemberIdFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = "left"
        tempCtx.fillText(memberData.memberid.toString(), settings.memberIdPosition.x, settings.memberIdPosition.y)

        // Draw QR Code using the same method as canvas preview
        if (downloadQrCanvas) {
          tempCtx.drawImage(
            downloadQrCanvas,
            settings.qrCodePosition.x,
            settings.qrCodePosition.y,
            settings.qrCodeSize.width,
            settings.qrCodeSize.height,
          )
        } else {
          console.error("QR code canvas not ready for download.")
        }
      } else {
        // Back ID - expiry date - use settings position and font, make bold
        const baseExpiryFontSize = Number.parseInt(settings.expiryFont)
        tempCtx.font = `bold ${baseExpiryFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = "left"
        tempCtx.fillText(settings.expiryDate, settings.expiryPosition.x, settings.expiryPosition.y)
      }

      // Create download link
      const link = document.createElement("a")
      link.download = `lr-id-${memberData.memberid}-${isFront ? "front" : "back"}.png`
      link.href = tempCanvas.toDataURL("image/png", 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error generating download:", error)
      alert("Error generating download. Please try again.")
    }
  }

  // These variables are now safely defined after memberData is guaranteed to be non-null
  // or use optional chaining for initial render.
  const qrCodeContent = memberData?.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""
  const isNameInputEditable =
    memberData?.completename?.includes("&") ||
    memberData?.completename?.includes("And") ||
    memberData?.completename?.includes("and") ||
    false

  const CANVAS_WIDTH = 1050
  const CANVAS_HEIGHT = 1650
  const [isLoading, setIsLoading] = useState(false) // This isLoading is for canvas drawing, not initial page load
  const canvasRef = useRef<HTMLCanvasElement>(null) // This is not used in this file, but kept for consistency
  const [qrCodeCanvas, setQrCodeCanvas] = useState<HTMLCanvasElement | null>(null)

  const [qrCodeSize, setQrCodeSize] = useState(settings.qrCodeSize)
  const [qrCodeErrorCorrection, setQrCodeErrorCorrection] = useState(settings.qrCodeErrorCorrection)
  const [qrCodeMargin, setQrCodeMargin] = useState(settings.qrCodeMargin)
  const [qrCodeModuleShape, setQrCodeModuleShape] = useState(settings.qrCodeModuleShape)
  const [qrCodeEyeShape, setQrCodeEyeShape] = useState(settings.qrCodeEyeShape)
  const [qrCodeCornerRadius, setQrCodeCornerRadius] = useState(settings.qrCodeCornerRadius)

  useEffect(() => {
    setQrCodeSize(settings.qrCodeSize)
    setQrCodeErrorCorrection(settings.qrCodeErrorCorrection)
    setQrCodeMargin(settings.qrCodeMargin)
    setQrCodeModuleShape(settings.qrCodeModuleShape)
    setQrCodeEyeShape(settings.qrCodeEyeShape)
    setQrCodeCornerRadius(settings.qrCodeCornerRadius)
  }, [settings])

  const handleQRCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setQrCodeCanvas(canvas)
  }, [])

  // Show loading spinner if data is still being fetched or parsed
  if (loading || !memberData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16">
          <svg
            className="animate-spin w-full h-full text-red-600"
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
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={180} height={60} />
            <h1 className="text-xl font-bold ml-4 hidden md:block">ID Generator</h1>
          </div>
          <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-900 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <IdSettings
              memberData={memberData}
              onSettingsChange={handleSettingsChange}
              uploadedImageUrl={uploadedImageUrl}
              onImageUpload={handleImageUpload}
              editableName={editableName}
              onNameChange={handleNameChange}
              isNameInputEditable={isNameInputEditable} // Pass new prop
            />
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">ID Preview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front ID */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium mb-3 text-center">Front</h3>
                  <div className="bg-black p-4 rounded-lg flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative">
                        {/* IdCanvas component for rendering the ID */}
                        <IdCanvas
                          memberData={memberData}
                          position={settings.position}
                          isFront={true}
                          namePosition={settings.namePosition}
                          nameFont={settings.nameFont}
                          nameWidth={settings.nameWidth}
                          nameAlign={settings.nameAlign}
                          memberIdPosition={settings.memberIdPosition}
                          memberIdFont={settings.memberIdFont}
                          positionPosition={settings.positionPosition}
                          positionFont={settings.positionFont}
                          positionWidth={settings.positionWidth}
                          positionAlign={settings.positionAlign}
                          uploadedImageUrl={uploadedImageUrl}
                          uploadedImagePosition={settings.uploadedImagePosition}
                          uploadedImageSize={settings.uploadedImageSize}
                          editableName={editableName}
                          expiryDate={settings.expiryDate}
                          expiryPosition={settings.expiryPosition}
                          expiryFont={settings.expiryFont}
                          qrCodePosition={settings.qrCodePosition}
                          qrCodeSize={settings.qrCodeSize}
                          qrCodeErrorCorrection={settings.qrCodeErrorCorrection}
                          qrCodeMargin={settings.qrCodeMargin}
                          qrCodeModuleShape={settings.qrCodeModuleShape}
                          qrCodeEyeShape={settings.qrCodeEyeShape}
                          qrCodeCornerRadius={settings.qrCodeCornerRadius}
                          onImagePositionChange={handleImagePositionChange}
                          onImageSizeChange={handleImageSizeChange}
                          isImageSelected={isImageSelected}
                          onImageSelectedChange={handleImageSelectedChange}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(true)}
                    className="mt-3 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Front
                  </button>
                </div>

                {/* Back ID */}
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium mb-3 text-center">Back</h3>
                  <div className="bg-black p-4 rounded-lg flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative">
                        {/* IdCanvas component for rendering the ID */}
                        <IdCanvas
                          memberData={memberData}
                          position={settings.position}
                          isFront={false}
                          namePosition={settings.namePosition}
                          nameFont={settings.nameFont}
                          nameWidth={settings.nameWidth}
                          nameAlign={settings.nameAlign}
                          memberIdPosition={settings.memberIdPosition}
                          memberIdFont={settings.memberIdFont}
                          positionPosition={settings.positionPosition}
                          positionFont={settings.positionFont}
                          positionWidth={settings.positionWidth}
                          positionAlign={settings.positionAlign}
                          uploadedImageUrl={uploadedImageUrl}
                          uploadedImagePosition={settings.uploadedImagePosition}
                          uploadedImageSize={settings.uploadedImageSize}
                          editableName={editableName}
                          expiryDate={settings.expiryDate}
                          expiryPosition={settings.expiryPosition}
                          expiryFont={settings.expiryFont}
                          qrCodePosition={settings.qrCodePosition}
                          qrCodeSize={settings.qrCodeSize}
                          qrCodeErrorCorrection={settings.qrCodeErrorCorrection}
                          qrCodeMargin={settings.qrCodeMargin}
                          qrCodeModuleShape={settings.qrCodeModuleShape}
                          qrCodeEyeShape={settings.qrCodeEyeShape}
                          qrCodeCornerRadius={settings.qrCodeCornerRadius}
                          onImagePositionChange={handleImagePositionChange}
                          onImageSizeChange={handleImageSizeChange}
                          isImageSelected={isImageSelected}
                          onImageSelectedChange={handleImageSelectedChange}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(false)}
                    className="mt-3 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Back
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-2">Interactive ID Editor</h3>
                <p className="text-gray-600 text-sm mb-2">
                  <strong>Image Controls:</strong> Upload an image, click to select, drag to move, click outside to
                  deselect.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Text Positioning:</strong> Text positions and font sizes are now fixed for consistency. Only
                  the expiry date can be edited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden QR Code Renderer for Download - uses the same library as canvas preview */}
      {qrCodeContent && (
        <QRCodeRenderer
          value={qrCodeContent}
          size={settings.qrCodeSize.width}
          fgColor="#003b64"
          bgColor="#FFFFFF00"
          qrStyle={settings.qrCodeModuleShape}
          eyeShape={settings.qrCodeEyeShape}
          cornerRadius={settings.qrCodeCornerRadius}
          errorCorrectionLevel={settings.qrCodeErrorCorrection}
          margin={settings.qrCodeMargin}
          onCanvasReady={handleDownloadQRCanvasReady}
          key={`download-${settings.qrCodeSize.width}-${settings.qrCodeSize.height}-${settings.qrCodeModuleShape}-${settings.qrCodeEyeShape}-${settings.qrCodeCornerRadius}-${settings.qrCodeErrorCorrection}-${settings.qrCodeMargin}`}
        />
      )}
    </div>
  )
}
