import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const headersList = headers()

    const {
      memberId,
      email,
      firstName,
      middleName,
      lastName,
      completeName,
      memberType, // We'll receive this but not send it to Laravel
      status, // We'll receive this but not send it to Laravel
      sessionId,
      action, // 'access', 'front_download', 'back_download'
    } = body

    // Get user agent and IP address from headers
    const userAgent = headersList.get("user-agent") || ""
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"

    // Prepare data for Laravel API - removed member_type and status fields
    const logData = {
      member_id: memberId,
      email: email,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      // member_type: memberType, // Removed this field
      // status: status, // Removed this field
      user_agent: userAgent,
      ip_address: ipAddress,
      session_id: sessionId,
      front_downloaded: action === "front_download",
      back_downloaded: action === "back_download",
      front_download_timestamp: action === "front_download" ? new Date().toISOString() : null,
      back_download_timestamp: action === "back_download" ? new Date().toISOString() : null,
    }

    console.log("Sending ID Generator Log to Laravel API:", logData)

    // Send to Laravel API
    const response = await fetch("https://api.leuteriorealty.com/lr/v1/public/api/id-generator-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "LR-ID-Generator-NextJS",
      },
      body: JSON.stringify(logData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Laravel API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })

      return NextResponse.json(
        {
          success: false,
          message: "Failed to log to Laravel API",
          error: errorData.message || errorData.errors || `API responded with status ${response.status}`,
          details: errorData, // Include full error details for debugging
        },
        { status: response.status },
      )
    }

    const responseData = await response.json()
    console.log("Laravel API Response:", responseData)

    return NextResponse.json({
      success: true,
      message: "ID generation logged successfully",
      data: responseData,
    })
  } catch (error) {
    console.error("Error logging ID generation:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to log ID generation",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
