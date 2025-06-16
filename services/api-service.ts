import type { MemberResponse } from "@/types/api-types"
import { mockMemberResponse } from "@/mocks/member-data"

export async function fetchMemberData(memberId: string, useMockData = false): Promise<MemberResponse> {
  // Return mock data if enabled
  if (useMockData || process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    console.log("Using mock data")
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockMemberResponse), 1000)
    })
  }

  try {
    console.log(`API Service: Fetching data for member ID: ${memberId}`)

    // Use our proxy API route instead of calling the external API directly
    const response = await fetch(`/api/member/${memberId}`, {
      // Disable any automatic CORS handling
      cache: "no-store",
      next: { revalidate: 0 },
    })

    console.log(`API Service: Response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("API Service: Error response:", errorData)

      throw new Error(errorData.message || errorData.details || `API request failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log("API Service: Data received successfully")

    return data
  } catch (error) {
    console.error("API Service: Error fetching member data:", error)
    throw error
  }
}
