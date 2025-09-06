export interface User {
  username: string
  password: string
  createdAt: string
  lastLogin: string | null
  level: number
  gamesPlayed: number
  wins: number
  settings: {
    rememberMe: boolean
    notifications: boolean
    soundEnabled: boolean
  }
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" }
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" }
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" }
  }

  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number or special character" }
  }

  return { isValid: true }
}

export function sanitizeUsername(username: string): string {
  return username.replace(/[^a-zA-Z0-9_]/g, "")
}
