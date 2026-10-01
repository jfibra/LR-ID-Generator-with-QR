"use client"

import { useRouter, useSearchParams, notFound } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import LoadingAnimation from "@/components/loading-animation"
import { fetchMemberData } from "@/services/api-service"
import type { MemberData } from "@/types/api-types"
import DebugPanel from "@/components/debug-panel"
import ApiTest from "@/components/api-test"
import Image from "next/image"

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [useMockData, setUseMockData] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("USE_MOCK_DATA") === "true"
    }
    return false
  })

  useEffect(() => {
    if (useMockData) {
      localStorage.setItem("USE_MOCK_DATA", "true")
    } else {
      localStorage.removeItem("USE_MOCK_DATA")
    }
  }, [useMockData])

  useEffect(() => {
    const memberId = searchParams.get("memberid")

    if (!memberId) {
      notFound()
      return
    }

    const fetchData = async () => {
      try {
        console.log(`Client: Fetching data for member ID: ${memberId}`)
        console.log(`Client: Using mock data: ${useMockData}`)

        const response = await fetchMemberData(memberId, useMockData)

        if (response.success && response.data) {
          console.log("Client: Data fetched successfully")
          setMemberData(response.data)
        } else {
          console.error("Client: API returned error:", response.message)
          setError(response.message || "Failed to fetch member data")
          setLoading(false)
        }
      } catch (err) {
        console.error("Client: API Error:", err)
        setError(`Error: ${err instanceof Error ? err.message : "Unknown error occurred"}`)
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams, useMockData])

  useEffect(() => {
    if (animationComplete && memberData) {
      console.log("Animation complete, redirecting to ID generator")
      sessionStorage.setItem("memberData", JSON.stringify(memberData))
      router.push("/id-generator")
    }
  }, [animationComplete, memberData, router])

  const handleAnimationComplete = () => {
    console.log("Animation complete callback triggered")
    setAnimationComplete(true)
  }

  if (error) {
    const memberId = searchParams.get("memberid")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-3 sm:p-4">
        <div className="w-48 sm:w-64 mb-6 sm:mb-8">
          <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
              !
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-600">Verification Error</h1>
              <p className="text-xs text-slate-500">Could not retrieve member information</p>
            </div>
          </div>
          <p className="text-slate-700 bg-red-50 p-4 rounded-xl border border-red-100 text-sm mb-6">{error}</p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <label className="flex items-center cursor-pointer text-sm text-slate-700 select-none">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={() => setUseMockData(!useMockData)}
                className="mr-2 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Use mock data for testing</span>
            </label>

            <button
              onClick={() => {
                window.location.reload()
              }}
              className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>

          {memberId && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <ApiTest memberId={memberId} />
            </div>
          )}
        </div>
        <DebugPanel error={error} memberId={memberId} />
      </div>
    )
  }

  if (loading && !animationComplete) {
    return <LoadingAnimation onComplete={handleAnimationComplete} />
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-3 sm:p-4">
      <div className="w-48 sm:w-64 mb-6 sm:mb-8">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} priority />
      </div>
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md w-full">
        <h1 className="text-xl font-bold text-[#003b64] mb-2">Redirecting to ID Studio...</h1>
        <p className="text-slate-600 text-sm mb-6">Please wait while we prepare your ID generator.</p>
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <button
          onClick={() => {
            if (memberData) {
              sessionStorage.setItem("memberData", JSON.stringify(memberData))
              router.push("/id-generator")
            }
          }}
          className="w-full px-5 py-2.5 bg-[#003b64] hover:bg-[#002b49] text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          Go to ID Generator
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
