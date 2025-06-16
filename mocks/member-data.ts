import type { MemberResponse } from "@/types/api-types"

export const mockMemberResponse: MemberResponse = {
  success: true,
  data: {
    id: 218171588,
    memberid: 1003220404,
    fn: "Johnry",
    mn: "Aneda",
    ln: "Fibra",
    email: "johnryfibra2@gmail.com",
    mobile: "+639193102370",
    completename: "Johnry Aneda Fibra",
    status: "active",
    membertype: "superadmin",
    photo: "20250321011635.jpg",
    // Add other fields as needed
  },
  message: "Member data retrieved successfully",
}
