import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json()

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Username, current password, and new password are required" }, { status: 400 })
    }

    const usersDir = path.join(process.cwd(), "users")

    // Find the user file with current credentials
    const currentFileName = `${username}_${currentPassword}.json`
    const currentFilePath = path.join(usersDir, currentFileName)

    try {
      // Check if current credentials are correct
      const userData = await fs.readFile(currentFilePath, "utf8")
      const user = JSON.parse(userData)

      // Create new filename with updated password
      const newFileName = `${username}_${newPassword}.json`
      const newFilePath = path.join(usersDir, newFileName)

      // Update user data
      const updatedUser = {
        ...user,
        password: newPassword,
        lastPasswordChange: new Date().toISOString(),
      }

      // Write to new file
      await fs.writeFile(newFilePath, JSON.stringify(updatedUser, null, 2))

      // Delete old file
      await fs.unlink(currentFilePath)

      return NextResponse.json({
        message: "Password reset successful",
        user: {
          username: updatedUser.username,
          level: updatedUser.level,
          gamesPlayed: updatedUser.gamesPlayed,
          wins: updatedUser.wins,
          createdAt: updatedUser.createdAt,
          lastLogin: updatedUser.lastLogin,
        },
      })
    } catch (error) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
