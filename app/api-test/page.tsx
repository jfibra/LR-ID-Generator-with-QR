"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

export default function ApiTestPage() {
  const searchParams = useSearchParams()
  const [memberId, setMemberId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = searchParams.get("memberid")
    if (id) {
      setMemberId(id)
    }
  }, [searchParams])

  const testApi = async () => {
    if (!memberId) {
      setError("Please enter a member ID")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Test the server-side API route
      const response = await fetch(`/api/member/${memberId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API responded with status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(`API error: ${err instanceof Error ? err.message : "Unknown error"}`)
      console.error("API error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-center mb-8">
        <Image src="/images/leuterio-logo.png" alt="Leuterio Realty Logo" width={300} height={100} />
      </div>

      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">API Test Tool</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter member ID"
            />
            <button
              onClick={testApi}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test API"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div>
            <h2 className="text-lg font-bold mb-2">API Result:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-bold mb-2">Instructions</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Enter a member ID in the field above</li>
            <li>Click "Test API" to make a request to the server-side API route</li>
            <li>View the results or error message below</li>
            <li>Check the browser console for additional debugging information</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
