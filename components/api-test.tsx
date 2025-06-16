"use client"

import { useState } from "react"

export default function ApiTest({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false)
  const [directResult, setDirectResult] = useState<any>(null)
  const [proxyResult, setProxyResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testDirectApi = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://api.leuteriorealty.com/lr/v1/public/api/member-with-user/${memberId}`, {
        mode: "cors", // This will likely fail due to CORS
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      setDirectResult(data)
    } catch (err) {
      setError(`Direct API error: ${err instanceof Error ? err.message : "Unknown error"}`)
      console.error("Direct API error:", err)
    } finally {
      setLoading(false)
    }
  }

  const testProxyApi = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/member/${memberId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `API responded with status: ${response.status}`)
      }

      const data = await response.json()
      setProxyResult(data)
    } catch (err) {
      setError(`Proxy API error: ${err instanceof Error ? err.message : "Unknown error"}`)
      console.error("Proxy API error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <h2 className="text-lg font-bold mb-4">API Testing Tool</h2>

      <div className="flex gap-4 mb-4">
        <button
          onClick={testDirectApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Direct API
        </button>

        <button
          onClick={testProxyApi}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test Proxy API
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {directResult && (
        <div className="mb-4">
          <h3 className="font-bold">Direct API Result:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(directResult, null, 2)}
          </pre>
        </div>
      )}

      {proxyResult && (
        <div>
          <h3 className="font-bold">Proxy API Result:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60 text-xs">
            {JSON.stringify(proxyResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
