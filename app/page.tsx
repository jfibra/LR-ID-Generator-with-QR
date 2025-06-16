"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import LoadingAnimation from "@/components/loading-animation"
import { fetchMemberData } from "@/services/api-service"
import type { MemberData } from "@/types/api-types"
import DebugPanel from "@/components/debug-panel"
import ApiTest from "@/components/api-test"
import Image from "next/image"
import { notFound } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [useMockData, setUseMockData] = useState(() => {
    // Initialize from localStorage if available
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
      // Redirect to 404 page if no memberid is provided
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
          // Keep loading true to show the animation
        } else {
          console.error("Client: API returned error:", response.message)
          setError(response.message || "Failed to fetch member data")
          setLoading(false)
        }
      } catch (error) {
        console.error("Client: API Error:", error)
        setError(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`)
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams, useMockData])

  // Add this effect to handle the animation completion and redirection
  useEffect(() => {
    if (animationComplete && memberData) {
      console.log("Animation complete, redirecting to ID generator")
      // Store the data in sessionStorage before redirecting
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-64 mb-8">
          <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-3xl">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700">{error}</p>
          <div className="mt-4 flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={() => setUseMockData(!useMockData)}
                className="mr-2"
              />
              <span>Use mock data for testing</span>
            </label>
          </div>
          <button
            onClick={() => {
              window.location.reload()
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>

          {memberId && <ApiTest memberId={memberId} />}
        </div>
        <DebugPanel error={error} memberId={memberId} />
      </div>
    )
  }

  if (loading && !animationComplete) {
    return <LoadingAnimation onComplete={handleAnimationComplete} />
  }

  // This is a fallback in case something goes wrong with the animation or redirection
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-64 mb-8">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={400} height={150} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-xl font-bold text-blue-600 mb-2">Redirecting...</h1>
        <p className="text-gray-700">Please wait while we redirect you to the ID generator.</p>
        <div className="mt-4 flex justify-center">
          <div className="w-8 h-8">
            <svg
              className="animate-spin w-full h-full text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        </div>
        <button
          onClick={() => {
            if (memberData) {
              sessionStorage.setItem("memberData", JSON.stringify(memberData))
              router.push("/id-generator")
            }
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Go to ID Generator
        </button>
      </div>
    </div>
  )
}
