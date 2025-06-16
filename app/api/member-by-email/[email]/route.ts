import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email)

  console.log(`Server: Fetching member data for email: ${email}`)

  try {
    const apiUrl = `https://api.leuteriorealty.com/lr/v1/public/api/member-with-user-by-email/${encodeURIComponent(email)}`
    console.log(`Server: Making request to: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 Next.js API Proxy",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    })

    console.log(`Server: Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Server: API error response: ${errorText}`)

      return NextResponse.json(
        {
          success: false,
          message: response.status === 404 ? "Member not found" : `API responded with status: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const originalData = await response.json()
    console.log("Server: Raw API response:", originalData)

    // Transform the data to match our expected format
    const transformedData = {
      success: true,
      data: originalData.member,
      message: "Member data retrieved successfully",
      user: originalData.user,
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
