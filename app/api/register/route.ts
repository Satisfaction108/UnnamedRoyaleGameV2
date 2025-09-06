import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, access } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Validate username (alphanumeric only for file safety)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 },
      )
    }

    // Create users directory if it doesn't exist
    const usersDir = join(process.cwd(), "users")
    try {
      await access(usersDir)
    } catch {
      await mkdir(usersDir, { recursive: true })
    }

    // Create filename as username_password.json
    const filename = `${username}_${password}.json`
    const filepath = join(usersDir, filename)

    // Check if user already exists (check for any file starting with username_)
    try {
      const { readdir } = await import("fs/promises")
      const files = await readdir(usersDir)
      const userExists = files.some((file) => file.startsWith(`${username}_`))

      if (userExists) {
        return NextResponse.json({ error: "Username already exists" }, { status: 409 })
      }
    } catch {
      // Directory doesn't exist yet, which is fine
    }

    // Create user data
    const userData = {
      username,
      password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(), // Set lastLogin to current time for new users
      level: 1,
      gamesPlayed: 0,
      wins: 0,
      settings: {
        rememberMe: false,
        notifications: true,
        soundEnabled: true,
      },
    }

    // Write user file
    await writeFile(filepath, JSON.stringify(userData, null, 2))

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          username: userData.username,
          level: userData.level,
          gamesPlayed: userData.gamesPlayed,
          wins: userData.wins,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
