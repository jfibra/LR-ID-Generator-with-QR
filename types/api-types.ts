export interface ApiResponse {
  member: MemberData
  user: UserData
}

export interface MemberResponse {
  success: boolean
  data: MemberData
  message: string
}

export interface MemberData {
  id: number
  memberid: number
  fn: string
  mn: string
  ln: string
  email: string
  mobile: string
  photo?: string
  completename: string
  dateactivated?: number
  datesign?: string
  status?: string
  membertype?: string
  // Add other fields as needed
}

export interface UserData {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
  role_id: number
}
