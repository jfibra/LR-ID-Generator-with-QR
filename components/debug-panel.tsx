"use client"

import Link from "next/link"
import { useState } from "react"

interface DebugPanelProps {
  error: string | null
  memberId: string | null
}

export default function DebugPanel({ error, memberId }: DebugPanelProps) {
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchRawResponse = async () => {
    if (!memberId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/member/${memberId}`)
      const data = await response.json()
      setRawResponse(data)
    } catch (error) {
      console.error("Error fetching raw response:", error)
    } finally {
      setLoading(false)
      setShowRawResponse(true)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 text-sm">
      <div className="container mx-auto">
        <h3 className="font-bold mb-2">Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Member ID:</strong> {memberId || "Not provided"}
            </p>
            <p>
              <strong>API Endpoint:</strong> {memberId ? `/api/member/${memberId}` : "N/A"}
            </p>
          </div>
          <div>
            <p>
              <strong>Error:</strong> {error || "None"}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Retry Request
              </button>

              {memberId && (
                <>
                  <Link
                    href={`/api-test?memberid=${memberId}`}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Open API Test Tool
                  </Link>
                  <button
                    onClick={fetchRawResponse}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "View Raw Response"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showRawResponse && rawResponse && (
          <div className="mt-4 bg-gray-900 p-4 rounded overflow-auto max-h-60">
            <div className="flex justify-between mb-2">
              <h4 className="font-bold">Raw API Response:</h4>
              <button onClick={() => setShowRawResponse(false)} className="text-xs text-gray-400 hover:text-white">
                Close
              </button>
            </div>
            <pre className="text-xs text-green-400">{JSON.stringify(rawResponse, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
