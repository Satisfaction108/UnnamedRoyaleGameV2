import { type NextRequest, NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Check users directory
    const usersDir = join(process.cwd(), "users")

    try {
      // Look for user file with matching username and password
      const files = await readdir(usersDir)
      const userFile = files.find((file) => file === `${username}_${password}.json`)

      if (!userFile) {
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
      }

      // Read user data
      const userFilePath = join(usersDir, userFile)
      const userData = JSON.parse(await readFile(userFilePath, "utf-8"))

      // Update last login time
      userData.lastLogin = new Date().toISOString()
      userData.settings.rememberMe = rememberMe

      // Write updated user data back
      const { writeFile } = await import("fs/promises")
      await writeFile(userFilePath, JSON.stringify(userData, null, 2))

      // Return user session data (excluding password)
      const sessionData = {
        username: userData.username,
        level: userData.level,
        gamesPlayed: userData.gamesPlayed,
        wins: userData.wins,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        settings: userData.settings,
      }

      return NextResponse.json(
        {
          message: "Login successful",
          user: sessionData,
          rememberMe,
        },
        { status: 200 },
      )
    } catch (error) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
