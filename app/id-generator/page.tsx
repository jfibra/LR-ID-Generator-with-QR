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
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null)
  const [editableName, setEditableName] = useState<string>("")
  const [isImageSelected, setIsImageSelected] = useState(false)
  const [isSignatureSelected, setIsSignatureSelected] = useState(false)
  const [isFront, setIsFront] = useState(true)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const hasLoggedAccessRef = useRef(false)

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
    uploadedImagePosition: { x: 258, y: 255 },
    uploadedImageSize: { width: 520, height: 520 },
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
    signaturePosition: { x: 300, y: 120 },
    signatureSize: { width: 450, height: 130 },
  })

  const [downloadQrCanvas, setDownloadQrCanvas] = useState<HTMLCanvasElement | null>(null)
  const [mobileTab, setMobileTab] = useState<"preview" | "settings">("preview")
  const [showPolicyModal, setShowPolicyModal] = useState(true)
  const [modalMode, setModalMode] = useState<"onboarding" | "download">("onboarding")
  const [downloadStep, setDownloadStep] = useState<"idle" | "front" | "back" | "done">("idle")

  const logIdGeneration = useCallback(
    async (action: "access" | "front_download" | "back_download") => {
      if (!memberData) return

      try {
        console.log(`Logging ID generation action: ${action}`)

        const response = await fetch("/api/log-id-generation", {
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

        const result = await response.json()

        if (result.success) {
          console.log(`Successfully logged ${action}:`, result.data)
        } else {
          console.error(`Failed to log ${action}:`, result.message)
        }
      } catch (error) {
        console.error(`Failed to log ID generation (${action}):`, error)
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

        if (!hasLoggedAccessRef.current) {
          hasLoggedAccessRef.current = true
          fetch("/api/log-id-generation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              memberId: parsedData.memberid,
              email: parsedData.email,
              firstName: parsedData.fn,
              middleName: parsedData.mn,
              lastName: parsedData.ln,
              completeName: parsedData.completename,
              memberType: parsedData.membertype,
              status: parsedData.status,
              sessionId,
              action: "access",
            }),
          }).catch((error) => {
            console.error("Failed to log ID generation (access):", error)
          })
        }
      } catch (error) {
        console.error("Error parsing member data:", error)
      }
    } else {
      router.push("/")
    }

    setLoading(false)
  }, [router, sessionId])

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
      signaturePosition: newSettings.signaturePosition || prev.signaturePosition,
      signatureSize: newSettings.signatureSize || prev.signatureSize,
    }))
  }, [])

  const handleSignatureUpload = useCallback((url: string | null) => {
    setSignatureImageUrl(url)
    setIsSignatureSelected(!!url)
    if (url) {
      setIsFront(false) // Automatically flip to back side to display the signature
      setMobileTab("preview") // Switch to preview on mobile devices
    }
  }, [])

  const handleSignaturePositionChange = useCallback((position: { x: number; y: number }) => {
    setSettings((prev) => ({
      ...prev,
      signaturePosition: position,
    }))
  }, [])

  const handleSignatureSelectedChange = useCallback((selected: boolean) => {
    setIsSignatureSelected(selected)
  }, [])

  const handleImageUpload = useCallback((url: string | null) => {
    setUploadedImageUrl(url)
    if (url) {
      setIsImageSelected(true)
      setIsFront(true) // Automatically flip to front side to display the profile photo
      setMobileTab("preview") // Switch to preview on mobile devices
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

  const downloadSide = async (isFront: boolean): Promise<boolean> => {
    logIdGeneration(isFront ? "front_download" : "back_download")

    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx || !memberData) return false

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
        if (!uploadedImageUrl.startsWith("data:") && !uploadedImageUrl.startsWith("blob:")) {
          uploadedImg.crossOrigin = "anonymous"
        }
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
        if (signatureImageUrl) {
          const sigImg = new window.Image()
          if (!signatureImageUrl.startsWith("data:") && !signatureImageUrl.startsWith("blob:")) {
            sigImg.crossOrigin = "anonymous"
          }
          sigImg.src = signatureImageUrl
          await new Promise((resolve) => {
            sigImg.onload = resolve
            sigImg.onerror = resolve
          })
          const sigPos = settings.signaturePosition || { x: 300, y: 120 }
          const sigSize = settings.signatureSize || { width: 450, height: 130 }
          tempCtx.drawImage(sigImg, sigPos.x, sigPos.y, sigSize.width, sigSize.height)
        }

        const baseExpiryFontSize = Number.parseInt(settings.expiryFont)
        tempCtx.font = `bold ${baseExpiryFontSize}px Arial`
        tempCtx.fillStyle = "#003b64"
        tempCtx.textAlign = "left"
        tempCtx.fillText(settings.expiryDate, settings.expiryPosition.x, settings.expiryPosition.y)
      }

      const link = document.createElement("a")
      link.download = `Leuterio-Realty-ID-${memberData.memberid}-${isFront ? "Front" : "Back"}.png`
      link.href = tempCanvas.toDataURL("image/png", 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return true
    } catch (error) {
      console.error(`Error generating ${isFront ? "front" : "back"} download:`, error)
      return false
    }
  }

  const handleStartSequentialDownload = async () => {
    try {
      setDownloadStep("front")
      await downloadSide(true)

      // Short delay between downloads to prevent browser multi-file download blocking
      setDownloadStep("back")
      await new Promise((resolve) => setTimeout(resolve, 600))
      await downloadSide(false)

      setDownloadStep("done")
      setTimeout(() => setDownloadStep("idle"), 3500)
    } catch (error) {
      console.error("Error during sequential download:", error)
      setDownloadStep("idle")
      alert("Error generating ID download. Please try again.")
    }
  }

  const handleDownloadButtonClick = () => {
    setModalMode("download")
    setShowPolicyModal(true)
  }

  const handleModalConfirm = () => {
    setShowPolicyModal(false)
    if (modalMode === "download") {
      handleStartSequentialDownload()
    }
  }

  const qrCodeContent = memberData?.email ? `https://leuteriorealty.com/business-card?email=${memberData.email}` : ""
  const isNameInputEditable =
    memberData?.completename?.includes("&") ||
    memberData?.completename?.includes("And") ||
    memberData?.completename?.includes("and") ||
    false

  if (loading || !memberData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Image
              src="/images/leuterio-logo.png"
              alt="Leuterio Realty Logo"
              width={180}
              height={60}
              className="h-7 sm:h-8 w-auto object-contain"
              priority
            />
            <div className="h-5 sm:h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[#003b64]">ID Generator</h1>
              <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold bg-red-50 text-red-600 rounded-md border border-red-100">
                Official Card
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#003b64] bg-slate-50 hover:bg-blue-50 border border-slate-200 px-2.5 sm:px-3.5 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden xs:inline">Back to </span>Portal
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex-1">
        {/* Mobile View Switcher (Only visible on screens < 768px) */}
        <div className="md:hidden sticky top-[53px] z-30 bg-white/95 backdrop-blur-md p-1 rounded-2xl mb-4 border border-slate-200 shadow-sm flex gap-1">
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === "preview"
                ? "bg-[#003b64] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 bg-slate-50"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            ID Preview
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mobileTab === "preview" ? "bg-white/20 text-white" : "bg-blue-100 text-[#003b64]"}`}>
              {isFront ? "Front" : "Back"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("settings")}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === "settings"
                ? "bg-[#003b64] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 bg-slate-50"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Photo & Settings
            {(uploadedImageUrl || signatureImageUrl) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Settings Column (On mobile: controlled by mobileTab; on tablet/desktop: 5/12 or 4/12 cols) */}
          <div className={`md:col-span-5 lg:col-span-4 ${mobileTab === "settings" ? "block" : "hidden md:block"}`}>
            <IdSettings
              memberData={memberData}
              onSettingsChange={handleSettingsChange}
              uploadedImageUrl={uploadedImageUrl}
              onImageUpload={handleImageUpload}
              editableName={editableName}
              onNameChange={handleNameChange}
              isNameInputEditable={isNameInputEditable}
              uploadedImagePosition={settings.uploadedImagePosition}
              onImagePositionChange={handleImagePositionChange}
              signatureImageUrl={signatureImageUrl}
              onSignatureUpload={handleSignatureUpload}
              signaturePosition={settings.signaturePosition}
              onSignaturePositionChange={handleSignaturePositionChange}
            />

            {/* Mobile quick view preview button */}
            <div className="md:hidden mt-4">
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className="w-full py-3 px-4 bg-[#003b64] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>View ID Card Preview</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Canvas Preview Area (On mobile: controlled by mobileTab; on tablet/desktop: 7/12 or 8/12 cols & sticky) */}
          <div className={`md:col-span-7 lg:col-span-8 md:sticky md:top-20 ${mobileTab === "preview" ? "block" : "hidden md:block"}`}>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 sm:mb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#003b64]">ID Preview</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">Live preview of your official Leuterio Realty ID card</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFront((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-[#003b64] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-sm active:scale-95"
                    title="Flip between front and back sides"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#003b64]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Flip to {isFront ? "Back Side" : "Front Side"}
                  </button>
                  <span className="text-[11px] sm:text-xs font-medium text-slate-600 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-lg">
                    CR80 Format
                  </span>
                </div>
              </div>

              {/* Single Side ID Display */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[360px] flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    <h3 className="text-sm font-bold text-[#003b64] uppercase tracking-wider">
                      {isFront ? "Front Side" : "Back Side"}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    1050 × 1650 px
                  </span>
                </div>

                <div className="w-full max-w-[340px] sm:max-w-[360px] bg-slate-50 border border-slate-200 p-2 sm:p-4 rounded-2xl flex items-center justify-center shadow-inner">
                  <div className="w-full">
                    <IdCanvas
                      memberData={memberData}
                      position={settings.position}
                      isFront={isFront}
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
                      signatureImageUrl={signatureImageUrl}
                      signaturePosition={settings.signaturePosition}
                      signatureSize={settings.signatureSize}
                      onSignaturePositionChange={handleSignaturePositionChange}
                      isSignatureSelected={isSignatureSelected}
                      onSignatureSelectedChange={handleSignatureSelectedChange}
                    />
                  </div>
                </div>

                {/* Unified Sequential Download Button & Controls */}
                <div className="flex flex-col items-center gap-3 w-full max-w-[340px] sm:max-w-[360px] mt-5">
                  <button
                    type="button"
                    onClick={handleDownloadButtonClick}
                    disabled={downloadStep !== "idle"}
                    className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {downloadStep === "idle" && (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
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
                        <span>Download Official ID (Front & Back)</span>
                      </>
                    )}
                    {downloadStep === "front" && (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Downloading Front Side...</span>
                      </>
                    )}
                    {downloadStep === "back" && (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Downloading Back Side...</span>
                      </>
                    )}
                    {downloadStep === "done" && (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-emerald-200"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Downloaded Both Sides!</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between w-full px-1">
                    <button
                      type="button"
                      onClick={() => setIsFront((prev) => !prev)}
                      className="py-1.5 px-3 bg-white hover:bg-blue-50 text-[#003b64] font-semibold text-xs rounded-xl border border-[#003b64]/30 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-[#003b64]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Flip to {isFront ? "Back Side" : "Front Side"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalMode("onboarding")
                        setShowPolicyModal(true)
                      }}
                      className="text-[11px] text-slate-500 hover:text-[#003b64] font-medium underline underline-offset-2 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Policy & Terms
                    </button>
                  </div>
                </div>

                {/* Mobile switch to settings button */}
                <div className="md:hidden w-full max-w-[340px] mt-4">
                  <button
                    type="button"
                    onClick={() => setMobileTab("settings")}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#003b64] font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Edit Photo, Name or Signature
                  </button>
                </div>
              </div>

              {/* Helper Notes */}
              <div className="mt-8 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-bold text-[#003b64] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Interactive ID Editor
                </h4>
                <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">
                  <strong className="text-slate-800">Photo Positioning:</strong> Upload a photo from the sidebar, then
                  click and drag the photo directly inside the card window to center your portrait.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Card Formatting:</strong> Text typography and QR code placements
                  conform to official Leuterio Realty brand standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden QR Code Renderer for export */}
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Leuterio Realty & Brokerage Inc. • All Rights Reserved</p>
      </footer>

      {/* Official ID Policy & Disclaimer Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Top Accent Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-[#003b64] via-blue-600 to-red-600 shrink-0" />

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Header Title */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-[#003b64] border border-blue-200 rounded">
                      Official Policy
                    </span>
                    {modalMode === "download" && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 rounded">
                        Download Confirmation
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#003b64] mt-1 leading-snug">
                    Official Identification Terms & Authorized Purpose
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Leuterio Realty & Brokerage Inc. • Compliance & Governance Policy
                  </p>
                </div>
              </div>

              {/* Authorized Purpose Notice */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003b64]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Authorized Purpose:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pl-5">
                  This credential is issued exclusively as <strong>proof of active identification</strong> as an authorized salesperson / real estate practitioner affiliated with <strong>Leuterio Realty and Brokerage Inc.</strong>
                </p>
              </div>

              {/* Strict Prohibition Card */}
              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Strictly Prohibited Uses:</span>
                </div>
                <ul className="text-xs text-slate-700 list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>
                    <strong>NEVER</strong> present, utilize, or submit this ID to lending companies, loan institutions, or financing providers for personal or commercial borrowing.
                  </li>
                  <li>
                    <strong>NEVER</strong> use this ID as loan collateral, security deposit, or guarantee for monetary debt.
                  </li>
                  <li>
                    <strong>NEVER</strong> represent or present this ID for debt collection agencies or debt recovery operations.
                  </li>
                </ul>
              </div>

              {/* Compliance & Legal Warning */}
              <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                <strong>Legal Notice:</strong> Any unauthorized use, misrepresentation, or fraudulent presentation of this credential is a direct violation of corporate regulations and applicable Philippine laws, and constitutes grounds for immediate revocation of affiliation, administrative sanctions, and civil or criminal legal prosecution.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
              {modalMode === "download" && (
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition-colors order-2 sm:order-1"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleModalConfirm}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 order-1 sm:order-2"
              >
                {modalMode === "download" ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>I Agree & Download ID (Front & Back)</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>I Understand & Acknowledge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
