import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  console.log(`Server: Fetching member data for ID: ${id}`)

  try {
    const apiUrl = `https://api.leuteriorealty.com/lr/v1/public/api/member-with-user/${id}`
    console.log(`Server: Making request to: ${apiUrl}`)

    // Use node-fetch or the global fetch with specific options to avoid CORS proxy
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 Next.js API Proxy",
      },
      cache: "no-store",
      // Disable automatic CORS handling
      next: { revalidate: 0 },
    })

    console.log(`Server: Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server: API error response: ${errorText}`)

      return NextResponse.json(
        {
          success: false,
          message: `API responded with status: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    // Parse the original API response
    const originalData = await response.json()
    console.log("Server: Raw API response:", originalData)

    // Transform the data to match our expected format
    const transformedData = {
      success: true,
      data: originalData.member,
      message: "Member data retrieved successfully",
      user: originalData.user, // Keep the user data as well
    }

    console.log(`Server: API response transformed successfully`)

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("Server: Error fetching member data:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Error connecting to API server",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
