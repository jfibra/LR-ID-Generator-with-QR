"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
  const [isImageSelected, setIsImageSelected] = useState(false)
  const [isFront, setIsFront] = useState(true)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [hasLoggedAccess, setHasLoggedAccess] = useState(false)

  const getExpiryDate = () => {
    const now = new Date()
    const expiry = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
    return expiry.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const [settings, setSettings] = useState<IdSettingsType>({
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
    uploadedImagePosition: { x: 150, y: 200 },
    uploadedImageSize: { width: 200, height: 200 },
    expiryDate: getExpiryDate(),
    expiryPosition: { x: 515, y: 1448 },
    expiryFont: "50px Arial",
    qrCodePosition: { x: 280, y: 865 },
    qrCodeSize: { width: 500, height: 500 },
    qrCodeErrorCorrection: "M",
    qrCodeMargin: 4,
    qrCodeModuleShape: "dots",
    qrCodeEyeShape: "circle",
    qrCodeCornerRadius: 10,
  })

  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [downloadQrCanvas, setDownloadQrCanvas] = useState<HTMLCanvasElement | null>(null)

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
    const storedData = sessionStorage.getItem("memberData")

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setMemberData(parsedData)

        const displayName = `${parsedData.fn} ${parsedData.ln}`.trim()
        setEditableName(displayName)

        if (!hasLoggedAccess) {
          setHasLoggedAccess(true)
          setTimeout(() => {
            logIdGeneration("access")
          }, 100)
        }
      } catch (error) {
        console.error("Error parsing member data:", error)
      }
    } else {
      router.push("/")
    }

    setLoading(false)
  }, [router])

  const handleSettingsChange = useCallback((newSettings: IdSettingsType) => {
    setSettings((prev) => ({
      ...prev,
      uploadedImagePosition: newSettings.uploadedImagePosition,
      uploadedImageSize: newSettings.uploadedImageSize,
      expiryDate: newSettings.expiryDate,
      qrCodePosition: newSettings.qrCodePosition,
      qrCodeSize: newSettings.qrCodeSize,
      qrCodeErrorCorrection: newSettings.qrCodeErrorCorrection,
      qrCodeMargin: newSettings.qrCodeMargin,
      qrCodeModuleShape: newSettings.qrCodeModuleShape,
      qrCodeEyeShape: newSettings.qrCodeEyeShape,
      qrCodeCornerRadius: newSettings.qrCodeCornerRadius,
    }))
  }, [])

  const handleImageUpload = useCallback((url: string | null) => {
    setUploadedImageUrl(url)
    if (url) {
      setIsImageSelected(true)
    } else {
      setIsImageSelected(false)
    }
  }, [])

  const handleNameChange = useCallback(
    (name: string) => {
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

  const handleDownloadQRCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setDownloadQrCanvas(canvas)
  }, [])

  const handleDownload = async (isFront: boolean) => {
    logIdGeneration(isFront ? "front_download" : "back_download")

    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx || !memberData) return

    const dpr = window.devicePixelRatio || 1

    const exportWidth = 1050
    const exportHeight = 1650
    tempCanvas.width = exportWidth * dpr
    tempCanvas.height = exportHeight * dpr

    tempCtx.scale(dpr, dpr)

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
      let uploadedImg: HTMLImageElement | null = null
      if (uploadedImageUrl && isFront) {
        uploadedImg = new window.Image()
        uploadedImg.crossOrigin = "anonymous"
        uploadedImg.src = uploadedImageUrl
        await new Promise((resolve) => {
          uploadedImg!.onload = resolve
          uploadedImg!.onerror = resolve
        })
      }

      const idImage = new window.Image()
      idImage.crossOrigin = "anonymous"
      idImage.src = isFront ? "/images/front-id.png" : "/images/back-id.png"
      await new Promise((resolve) => {
        idImage.onload = resolve
        idImage.onerror = resolve
      })

      if (uploadedImg && isFront) {
        tempCtx.drawImage(
          uploadedImg,
          settings.uploadedImagePosition.x,
          settings.uploadedImagePosition.y,
          settings.uploadedImageSize.width,
          settings.uploadedImageSize.height,
        )
      }

      tempCtx.drawImage(idImage, 0, 0, exportWidth, exportHeight)

      if (isFront) {
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

        const baseMemberIdFontSize = Number.parseInt(settings.memberIdFont)
        tempCtx.font = `bold ${baseMemberIdFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = "left"
        tempCtx.fillText(memberData.memberid.toString(), settings.memberIdPosition.x, settings.memberIdPosition.y)

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
        const baseExpiryFontSize = Number.parseInt(settings.expiryFont)
        tempCtx.font = `bold ${baseExpiryFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = "left"
        tempCtx.fillText(settings.expiryDate, settings.expiryPosition.x, settings.expiryPosition.y)
      }

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

  const qrCodeContent = memberData?.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""
  const isNameInputEditable =
    memberData?.completename?.includes("&") ||
    memberData?.completename?.includes("And") ||
    memberData?.completename?.includes("and") ||
    false

  const CANVAS_WIDTH = 1050
  const CANVAS_HEIGHT = 1650
  const [isLoading, setIsLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <IdSettings
              memberData={memberData}
              onSettingsChange={handleSettingsChange}
              uploadedImageUrl={uploadedImageUrl}
              onImageUpload={handleImageUpload}
              editableName={editableName}
              onNameChange={handleNameChange}
              isNameInputEditable={isNameInputEditable}
              uploadedImagePosition={settings.uploadedImagePosition} // Pass current position
              onImagePositionChange={handleImagePositionChange} // Pass position change handler
            />
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">ID Preview</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium mb-3 text-center">Front</h3>
                  <div className="bg-black p-4 rounded-lg flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative">
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

                <div className="flex flex-col">
                  <h3 className="text-lg font-medium mb-3 text-center">Back</h3>
                  <div className="bg-black p-4 rounded-lg flex-1 flex items-center justify-center">
                    <div className="w-full">
                      <div className="relative">
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
                  <strong>Image Controls:</strong> Upload an image, then use{" "}
                  {window.innerWidth <= 1024 ? "arrow controls in sidebar" : "click and drag on canvas"} to move the
                  image.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Text Positioning:</strong> Text positions and font sizes are now fixed for consistency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

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
