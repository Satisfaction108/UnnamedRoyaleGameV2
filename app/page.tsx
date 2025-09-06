"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Gamepad2,
  Users,
  Trophy,
  Zap,
  Settings,
  FileText,
  LogOut,
  AlertTriangle,
  Play,
  Eye,
  EyeOff,
} from "lucide-react"

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.077.077 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export default function HomePage() {
  const [showSignUp, setShowSignUp] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const [currentTheme, setCurrentTheme] = useState("default")
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedServer, setSelectedServer] = useState("1v1")
  const { toast } = useToast()

  const [
    showSignUpPassword,
    showSignUpConfirmPassword,
    showLoginPassword,
    showCurrentPassword,
    showNewPassword,
    showConfirmNewPassword,
  ] = [useState(false), useState(false), useState(false), useState(false), useState(false), useState(false)].map(
    (s) => s[0],
  )
  const [
    setShowSignUpPassword,
    setShowSignUpConfirmPassword,
    setShowLoginPassword,
    setShowCurrentPassword,
    setShowNewPassword,
    setShowConfirmNewPassword,
  ] = [useState(false), useState(false), useState(false), useState(false), useState(false), useState(false)].map(
    (s) => s[1],
  )

  const [signUpData, setSignUpData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  })

  const [resetPasswordData, setResetPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  })

  const [systemStatus, setSystemStatus] = useState("ONLINE")
  const [playerStatus, setPlayerStatus] = useState("READY")
  const [battleReadiness, setBattleReadiness] = useState(85)

  const themes = {
    default: {
      name: "Default",
      colors: {
        background: "#3B0E59",
        primary: "#C729F2",
        secondary: "#7B17A6",
        accent: "#13DCF2",
        text: "#ffffff",
        card: "#0B2740",
        destructive: "#ff4444",
        warning: "#ffaa00",
        success: "#00ff88",
        muted: "#7B17A6",
        mutedForeground: "#cccccc",
        border: "#C729F2",
      },
    },
    night: {
      name: "Night",
      colors: {
        background: "#0a0a0a",
        primary: "#1e90ff",
        secondary: "#ff4500",
        accent: "#32cd32",
        text: "#ffffff",
        card: "#1a1a1a",
        destructive: "#ff4444",
        warning: "#ffaa00",
        success: "#32cd32",
        muted: "#333333",
        mutedForeground: "#cccccc",
        border: "#1e90ff",
      },
    },
    forest: {
      name: "Forest",
      colors: {
        background: "#0d1f14",
        primary: "#2e8b57",
        secondary: "#556b2f",
        accent: "#8fbc8f",
        text: "#e0ffe0",
        card: "#1a2f1f",
        destructive: "#ff6b6b",
        warning: "#ffd93d",
        success: "#6bcf7f",
        muted: "#2d4a32",
        mutedForeground: "#b8d8b8",
        border: "#2e8b57",
      },
    },
    neon: {
      name: "Neon",
      colors: {
        background: "#0b0b0b",
        primary: "#39ff14",
        secondary: "#ff00ff",
        accent: "#00f9ff",
        text: "#ffffff",
        card: "#1a1a1a",
        destructive: "#ff073a",
        warning: "#ffff00",
        success: "#39ff14",
        muted: "#333333",
        mutedForeground: "#cccccc",
        border: "#39ff14",
      },
    },
    desert: {
      name: "Desert",
      colors: {
        background: "#f4e1b5",
        primary: "#8b4513",
        secondary: "#cd853f",
        accent: "#daa520",
        text: "#2f1b14",
        card: "#f0d090",
        destructive: "#cc4125",
        warning: "#ff8c00",
        success: "#228b22",
        muted: "#e6d4a7",
        mutedForeground: "#5d4e37",
        border: "#8b4513",
      },
    },
    ocean: {
      name: "Ocean",
      colors: {
        background: "#001f3f",
        primary: "#0074d9",
        secondary: "#7fdbff",
        accent: "#39cccc",
        text: "#f0f8ff",
        card: "#003366",
        destructive: "#ff4136",
        warning: "#ffdc00",
        success: "#2ecc40",
        muted: "#004080",
        mutedForeground: "#b3d9ff",
        border: "#0074d9",
      },
    },
    lava: {
      name: "Lava",
      colors: {
        background: "#1a0000",
        primary: "#ff4500",
        secondary: "#ff6347",
        accent: "#ffd700",
        text: "#fff5e6",
        card: "#330000",
        destructive: "#ff0000",
        warning: "#ff8c00",
        success: "#32cd32",
        muted: "#4d0000",
        mutedForeground: "#ffccb3",
        border: "#ff4500",
      },
    },
    candy: {
      name: "Candy",
      colors: {
        background: "#fff0f5",
        primary: "#ff1493",
        secondary: "#ff69b4",
        accent: "#dda0dd",
        text: "#8b008b",
        card: "#ffe4e1",
        destructive: "#dc143c",
        warning: "#ff8c00",
        success: "#32cd32",
        muted: "#f8e8ee",
        mutedForeground: "#8b4789",
        border: "#ff1493",
      },
    },
    pork: {
      name: "Pork",
      colors: {
        background: "#fff5f5",
        primary: "#dc143c",
        secondary: "#ff6666",
        accent: "#ffb6c1",
        text: "#8b0000",
        card: "#ffeeee",
        destructive: "#b22222",
        warning: "#ff8c00",
        success: "#228b22",
        muted: "#ffe8e8",
        mutedForeground: "#a0522d",
        border: "#dc143c",
      },
    },
  }

  const applyTheme = (themeName: string) => {
    const theme = themes[themeName]
    if (!theme) return

    const root = document.documentElement
    root.style.setProperty("--background", theme.colors.background)
    root.style.setProperty("--primary", theme.colors.primary)
    root.style.setProperty("--secondary", theme.colors.secondary)
    root.style.setProperty("--accent", theme.colors.accent)
    root.style.setProperty("--foreground", theme.colors.text)
    root.style.setProperty("--card", theme.colors.card)
    root.style.setProperty("--card-foreground", theme.colors.text)
    root.style.setProperty("--muted", theme.colors.muted)
    root.style.setProperty("--muted-foreground", theme.colors.mutedForeground)
    root.style.setProperty("--border", theme.colors.border)
    root.style.setProperty("--destructive", theme.colors.destructive)
    root.style.setProperty("--warning", theme.colors.warning)
    root.style.setProperty("--success", theme.colors.success)

    root.style.setProperty("--sidebar-background", theme.colors.card)
    root.style.setProperty("--sidebar-foreground", theme.colors.text)
    root.style.setProperty("--sidebar-border", theme.colors.border)
    root.style.setProperty("--sidebar-accent", theme.colors.muted)
    root.style.setProperty("--sidebar-primary", theme.colors.primary)
    root.style.setProperty("--input", theme.colors.card)
    root.style.setProperty("--input-foreground", theme.colors.text)
    root.style.setProperty("--popover-background", theme.colors.card)
    root.style.setProperty("--popover-foreground", theme.colors.text)

    setCurrentTheme(themeName)
    localStorage.setItem("selectedTheme", themeName)
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("selectedTheme") || "default"
    applyTheme(savedTheme)
  }, [])

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25
    return strength
  }

  const passwordStrength = calculatePasswordStrength(signUpData.password)
  const resetPasswordStrength = calculatePasswordStrength(resetPasswordData.newPassword)

  const getStrengthColor = (strength: number) => {
    if (strength < 25) return "bg-destructive"
    if (strength < 50) return "bg-yellow-500"
    if (strength < 75) return "bg-orange-500"
    return "bg-green-500"
  }

  const getStrengthText = (strength: number) => {
    if (strength < 25) return "Weak"
    if (strength < 50) return "Fair"
    if (strength < 75) return "Good"
    return "Strong"
  }

  const handleSignUp = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: signUpData.username,
          password: signUpData.password,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setCurrentUser(result.user)
        setIsAuthenticated(true)
        sessionStorage.setItem("gameUser", JSON.stringify(result.user))

        toast({
          title: "Account created successfully!",
          description: "Welcome to UnnamedRoyaleGameV2",
        })
        setShowSignUp(false)
        setSignUpData({ username: "", password: "", confirmPassword: "" })
      } else {
        toast({
          title: "Registration failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password,
          rememberMe: loginData.rememberMe,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setCurrentUser(result.user)
        setIsAuthenticated(true)

        if (loginData.rememberMe) {
          localStorage.setItem("gameUser", JSON.stringify(result.user))
          localStorage.setItem("rememberMe", "true")
        } else {
          sessionStorage.setItem("gameUser", JSON.stringify(result.user))
        }

        toast({
          title: "Welcome back!",
          description: `Good to see you again, ${result.user.username}`,
        })

        setShowLogin(false)
        setLoginData({ username: "", password: "", rememberMe: false })
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (resetPasswordData.currentPassword === resetPasswordData.newPassword) {
      toast({
        title: "Password Reset Failed",
        description: "New password must be different from current password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: currentUser.username,
          currentPassword: resetPasswordData.currentPassword,
          newPassword: resetPasswordData.newPassword,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully",
        })
        setResetPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
        setCurrentUser(result.user)
      } else {
        toast({
          title: "Password Reset Failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Password Reset Failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem("gameUser")
    localStorage.removeItem("rememberMe")
    sessionStorage.removeItem("gameUser")
    setShowLogoutConfirm(false)
    setShowSettings(false)

    toast({
      title: "Logged out",
      description: "See you next time!",
    })
  }

  const handleDiscordClick = () => {
    window.open("https://discord.gg/JBWqcHWjg2", "_blank")
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("gameUser")
    const sessionUser = sessionStorage.getItem("gameUser")
    const rememberMe = localStorage.getItem("rememberMe") === "true"

    if (savedUser && rememberMe) {
      try {
        const userData = JSON.parse(savedUser)
        setCurrentUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem("gameUser")
        localStorage.removeItem("rememberMe")
      }
    } else if (sessionUser) {
      try {
        const userData = JSON.parse(sessionUser)
        setCurrentUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        sessionStorage.removeItem("gameUser")
      }
    }
  }, [])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)

  const isLoggedIn = isAuthenticated && currentUser

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-card/50 relative overflow-hidden">
        {/* HUD Header */}
        <div className="relative z-40 p-6 border-b border-primary/30 bg-card/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-12 w-12 border-2 border-primary/50 bg-card/70 hover:bg-primary/30 hover:border-primary/80 transition-all duration-300 relative group shadow-lg hover:shadow-primary/20"
              >
                <Settings className="h-6 w-6 text-primary group-hover:rotate-90 transition-transform duration-300 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg"></div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open("https://discord.gg/JBWqcHWjg2", "_blank")}
                className="h-12 w-12 border-2 border-accent/50 bg-card/70 hover:bg-accent/30 hover:border-accent/80 transition-all duration-300 relative group shadow-lg hover:shadow-accent/20"
              >
                <DiscordIcon className="h-6 w-6 text-accent group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg"></div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChangelogOpen(true)}
                className="h-12 w-12 border-2 border-primary/50 bg-card/70 hover:bg-primary/30 hover:border-primary/80 transition-all duration-300 relative group shadow-lg hover:shadow-primary/20"
              >
                <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg"></div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemes(true)}
                className="h-12 w-12 border-2 border-secondary/50 bg-card/70 hover:bg-secondary/30 hover:border-secondary/80 transition-all duration-300 relative group shadow-lg hover:shadow-secondary/20"
              >
                <div className="h-6 w-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary rounded-full animate-pulse"></div>
                  <div className="absolute inset-1 bg-card rounded-full"></div>
                  <div className="absolute inset-2 bg-gradient-to-br from-primary via-accent to-secondary rounded-full"></div>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse shadow-lg"></div>
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 border-primary/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse"></div>
              <div className="absolute top-2 right-2 text-xs font-mono text-primary/70 tracking-wider">STATS</div>

              <CardHeader className="relative z-10">
                <CardTitle className="text-primary font-mono tracking-wider flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></div>
                  PLAYER PROFILE
                </CardTitle>
                <CardDescription className="font-mono">Combat statistics and progression</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 space-y-4 relative z-10">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-mono">
                    <span>XP PROGRESS</span>
                    <span className="text-accent">{currentUser.xp || 0} / 1,000</span>
                  </div>
                  <Progress value={((currentUser.xp || 0) / 1000) * 100} className="h-3 bg-muted/30" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border border-primary/20 bg-primary/5">
                    <div className="text-2xl font-mono font-bold text-primary">{currentUser.level}</div>
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">LEVEL</div>
                  </div>
                  <div className="text-center p-3 border border-accent/20 bg-accent/5">
                    <div className="text-2xl font-mono font-bold text-accent">{currentUser.wins}</div>
                    <div className="text-xs font-mono text-muted-foreground tracking-wider">VICTORIES</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-sm">
                    <span>BATTLES:</span>
                    <span className="text-primary font-bold">{currentUser.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between font-mono text-sm">
                    <span>WIN RATE:</span>
                    <span className="text-accent font-bold">
                      {currentUser.gamesPlayed > 0 ? Math.round((currentUser.wins / currentUser.gamesPlayed) * 100) : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-sm">
                    <span>RANK:</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-2 border-accent/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-accent/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10"></div>
              <div className="absolute inset-0 border-2 border-accent/20 pointer-events-none animate-pulse"></div>

              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-accent/60 animate-pulse"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-accent/60 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-accent/60 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-accent/60 animate-pulse"></div>

              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse"></div>
              <div className="absolute top-2 right-2 text-xs font-mono text-accent/70 tracking-wider animate-pulse">
                COMBAT
              </div>

              <CardHeader className="relative z-10 text-center">
                <CardTitle className="text-3xl text-accent font-mono tracking-widest flex items-center justify-center">
                  <Zap className="mr-2 h-8 w-8 animate-pulse" />
                  BATTLE ZONE
                  <Zap className="ml-2 h-8 w-8 animate-pulse" />
                </CardTitle>
                <CardDescription className="font-mono tracking-wide text-accent/80"></CardDescription>
              </CardHeader>

              <div className="p-6 pt-0 space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="text-center w-full">
                    <Label
                      htmlFor="server-select"
                      className="text-lg font-mono tracking-widest text-accent font-bold block mb-2"
                    >
                      &gt;&gt;&gt; GAMEMODE SELECTION &lt;&lt;&lt;
                    </Label>
                  </div>
                  <div className="w-full">
                    <Select value={selectedServer} onValueChange={setSelectedServer}>
                      <SelectTrigger
                        id="server-select"
                        className="bg-input border-2 border-accent/50 w-full font-mono text-center hover:border-accent transition-all duration-300 h-12 text-lg font-bold tracking-wider"
                      >
                        <SelectValue placeholder="&gt;&gt;&gt; SELECT COMBAT MODE &lt;&lt;&lt;" />
                      </SelectTrigger>
                      <SelectContent className="font-mono bg-card border-2 border-accent/50">
                        <SelectItem value="1v1" className="font-bold tracking-wider">
                          1v1 DUEL
                        </SelectItem>
                        <SelectItem value="2v2" className="font-bold tracking-wider">
                          2v2 SQUAD
                        </SelectItem>
                        <SelectItem value="3v3" className="font-bold tracking-wider">
                          3v3 TEAM WAR
                        </SelectItem>
                        <SelectItem value="Battle Royale" className="font-bold tracking-wider">
                          BATTLE ROYALE
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full h-16 text-xl bg-accent hover:bg-accent/80 glow-effect font-mono tracking-widest border-4 border-accent/70 relative overflow-hidden group transition-all duration-300 hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <div className="absolute inset-0 border-2 border-accent/30 animate-pulse"></div>
                  <Play className="mr-3 h-8 w-8 animate-pulse" />
                  DEPLOY TO BATTLE
                  <Zap className="ml-3 h-8 w-8 animate-pulse" />
                </Button>

                <div className="text-center">
                  <div className="text-xs font-mono text-muted-foreground tracking-wider mb-1">BATTLE STATUS</div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono font-bold text-accent tracking-wider">READY FOR COMBAT</span>
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-2 border-primary/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none"></div>
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40"></div>
              <div className="absolute top-2 right-2 text-xs font-mono text-primary/70 tracking-wider">RANKS</div>

              <CardHeader className="relative z-10">
                <CardTitle className="text-primary font-mono tracking-widest flex items-center">
                  <Trophy className="mr-2 h-6 w-6 animate-pulse" />
                  GLOBAL RANKINGS
                </CardTitle>
                <CardDescription className="font-mono">Elite warrior standings</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 relative z-10">
                <div className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Trophy className="h-20 w-20 text-primary/50 animate-pulse" />
                    <div
                      className="absolute inset-0 h-20 w-20 border-2 border-primary/20 rotate-45 animate-spin"
                      style={{ animationDuration: "8s" }}
                    ></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-accent/30 rotate-45"></div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-mono tracking-wider text-primary font-bold">SYSTEM INITIALIZING</p>
                    <div className="flex items-center justify-center space-x-1">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      <div
                        className="w-2 h-2 bg-accent rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-accent rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                    <p className="text-xs font-mono opacity-70 tracking-wide">LOADING WARRIOR DATA...</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent
            side="left"
            className="w-[480px]"
            style={{
              backgroundColor: "hsl(var(--sidebar-background))",
              borderColor: "hsl(var(--sidebar-border))",
              color: "hsl(var(--sidebar-foreground))",
            }}
          >
            <SheetHeader className="px-2">
              <SheetTitle style={{ color: "hsl(var(--sidebar-foreground))" }}>Settings</SheetTitle>
              <SheetDescription style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>
                Manage your account and preferences
              </SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="account" className="mt-6 px-2">
              <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: "hsl(var(--sidebar-accent))" }}>
                <TabsTrigger
                  value="account"
                  className="data-[state=active]:text-white"
                  style={
                    {
                      color: "hsl(var(--sidebar-foreground))",
                      "--tw-data-state-active-bg": "hsl(var(--sidebar-primary))",
                    } as any
                  }
                >
                  Account
                </TabsTrigger>
                <TabsTrigger
                  value="logout"
                  className="data-[state=active]:text-white"
                  style={
                    {
                      color: "hsl(var(--sidebar-foreground))",
                      "--tw-data-state-active-bg": "hsl(var(--sidebar-primary))",
                    } as any
                  }
                >
                  Logout
                </TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4 mt-4">
                <div className="space-y-4 px-2">
                  <div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                      Account Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Username:</span>
                        <span className="font-medium" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                          {currentUser.username}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Level:</span>
                        <Badge variant="secondary">{currentUser.level}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Member since:</span>
                        <span style={{ color: "hsl(var(--sidebar-foreground))" }}>
                          {new Date(currentUser.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Games played:</span>
                        <span style={{ color: "hsl(var(--sidebar-foreground))" }}>{currentUser.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Wins:</span>
                        <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
                          {currentUser.wins}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                      Reset Password
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-password" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            value={resetPasswordData.currentPassword}
                            onChange={(e) =>
                              setResetPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                            }
                            className="pr-10"
                            style={{
                              backgroundColor: "hsl(var(--input))",
                              borderColor: "hsl(var(--sidebar-border))",
                              color: "hsl(var(--sidebar-foreground))",
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            ) : (
                              <Eye className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={resetPasswordData.newPassword}
                            onChange={(e) => setResetPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                            className="pr-10"
                            style={{
                              backgroundColor: "hsl(var(--input))",
                              borderColor: "hsl(var(--sidebar-border))",
                              color: "hsl(var(--sidebar-foreground))",
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            ) : (
                              <Eye className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            )}
                          </Button>
                        </div>
                        {resetPasswordData.newPassword && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>Password Strength:</span>
                              <Badge variant={resetPasswordStrength >= 75 ? "default" : "secondary"}>
                                {getStrengthText(resetPasswordStrength)}
                              </Badge>
                            </div>
                            <Progress value={resetPasswordStrength} className="h-2" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirm-new-password"
                            type={showConfirmNewPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={resetPasswordData.confirmNewPassword}
                            onChange={(e) =>
                              setResetPasswordData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
                            }
                            className="pr-10"
                            style={{
                              backgroundColor: "hsl(var(--input))",
                              borderColor: "hsl(var(--sidebar-border))",
                              color: "hsl(var(--sidebar-foreground))",
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            ) : (
                              <Eye className="h-4 w-4" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }} />
                            )}
                          </Button>
                        </div>
                        {resetPasswordData.confirmNewPassword &&
                          resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword && (
                            <p className="text-sm text-destructive">Passwords do not match</p>
                          )}
                        {resetPasswordData.currentPassword &&
                          resetPasswordData.newPassword &&
                          resetPasswordData.currentPassword === resetPasswordData.newPassword && (
                            <p className="text-sm text-destructive">
                              New password must be different from current password
                            </p>
                          )}
                      </div>
                      <Button
                        className="w-full"
                        style={{
                          backgroundColor: "hsl(var(--sidebar-primary))",
                          color: "white",
                        }}
                        disabled={
                          !resetPasswordData.currentPassword ||
                          !resetPasswordData.newPassword ||
                          resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword ||
                          resetPasswordData.currentPassword === resetPasswordData.newPassword ||
                          resetPasswordStrength < 50 ||
                          isLoading
                        }
                        onClick={handleResetPassword}
                      >
                        {isLoading ? "Resetting..." : "Reset Password"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="logout" className="space-y-4 mt-4">
                <div className="text-center space-y-4 px-2">
                  <div className="flex justify-center">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                      Are you sure you want to logout?
                    </h3>
                    <p className="text-sm" style={{ color: "hsl(var(--sidebar-foreground) / 0.7)" }}>
                      You will need to login again to access your account.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button variant="destructive" className="w-full" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Yes, Logout
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full hover:bg-opacity-20 bg-transparent"
                      style={{
                        backgroundColor: "transparent",
                        borderColor: "hsl(var(--sidebar-border))",
                        color: "hsl(var(--sidebar-foreground))",
                      }}
                      onClick={() => setSettingsOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>

        <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Changelog</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Latest updates and changes to UnnamedRoyaleGameV2
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4 bg-card/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Latest</Badge>
                  <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</span>
                </div>
                <h4 className="font-semibold mb-2 text-card-foreground">Beta Testing Released</h4>
                <p className="text-sm text-muted-foreground">The game is released as a beta version.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showThemes} onOpenChange={setShowThemes}>
          <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-sm border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-foreground font-mono tracking-wider">THEME SELECTOR</DialogTitle>
              <DialogDescription className="text-muted-foreground font-mono">
                Choose your battle interface theme
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {Object.entries(themes).map(([key, theme]) => {
                const isSelected = currentTheme === key
                const buttonBg = isSelected ? theme.colors.primary : "transparent"
                const textColor = isSelected
                  ? theme.colors.primary === "#FFFFFF" ||
                    theme.colors.primary === "#F2FFE3" ||
                    theme.colors.primary === "#FFB6C1"
                    ? "#000000"
                    : "#FFFFFF"
                  : "#FFFFFF"

                return (
                  <Button
                    key={key}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => applyTheme(key)}
                    className="h-20 flex flex-col items-center justify-center space-y-2 relative overflow-hidden group border-2"
                    style={{
                      backgroundColor: buttonBg,
                      borderColor: theme.colors.primary,
                      color: textColor,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 relative"
                      style={{
                        background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.accent})`,
                        borderColor: theme.colors.secondary,
                      }}
                    >
                      <div
                        className="absolute inset-1 rounded-full"
                        style={{ backgroundColor: theme.colors.background }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono font-bold tracking-wider" style={{ color: textColor }}>
                      {theme.name.toUpperCase()}
                    </span>
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-accent animate-pulse rounded-md"></div>
                    )}
                  </Button>
                )
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Confirm Logout</DialogTitle>
              <DialogDescription className="text-muted-foreground">Are you sure you want to logout?</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLogoutConfirm(false)}
                className="border-border text-card-foreground hover:bg-card/80"
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-primary glow-effect" />
            <h1 className="text-2xl font-bold text-balance">UnnamedRoyaleGameV2</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLogin(true)} className="border-border hover:bg-card/80">
              Login
            </Button>
            <Button onClick={() => setShowSignUp(true)} className="bg-primary hover:bg-primary/80 glow-effect">
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute top-10 left-10 w-32 h-32 border border-primary/20 rotate-45"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 border border-accent/20 rotate-12"></div>

        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-6xl font-bold mb-6 text-balance font-mono tracking-wider">
            <span className="text-primary glow-effect">UNNAMED</span>
            <span className="text-accent">ROYALE</span>
            <span className="text-primary glow-effect">GAME</span>
            <span className="text-foreground">V2</span>
          </h2>
          <div className="flex justify-center mb-8">
            <div className="bg-card/50 border-2 border-primary/30 px-8 py-4 backdrop-blur-sm">
              <p className="text-xl text-muted-foreground font-mono tracking-wide">BATTLE FOR VICTORY</p>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-12 py-4 bg-primary hover:bg-primary/80 glow-effect font-mono tracking-wider border-2 border-primary/50 relative overflow-hidden group"
              onClick={() => setShowSignUp(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Zap className="mr-2 h-6 w-6" />
              SIGN UP
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 grid-pattern"></div>
        </div>

        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-block bg-card/50 border-2 border-primary/30 px-8 py-4 backdrop-blur-sm">
              <h3 className="text-3xl font-bold text-foreground font-mono tracking-wider">GAME FEATURES</h3>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 border-primary/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              <CardHeader className="relative z-10">
                <div className="relative mb-4">
                  <Users className="h-12 w-12 text-primary" />
                  <div className="absolute inset-0 h-12 w-12 border border-primary/30 rotate-45"></div>
                </div>
                <CardTitle className="text-card-foreground font-mono tracking-wide">VARIOUS GAMEMODES</CardTitle>
                <CardDescription className="font-mono text-sm">
                  1v1, 2v2, 3v3, Battle Royale, and much more!
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 border-accent/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-accent/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
              <CardHeader className="relative z-10">
                <div className="relative mb-4">
                  <Trophy className="h-12 w-12 text-accent" />
                  <div className="absolute inset-0 h-12 w-12 border border-accent/30 rotate-45"></div>
                </div>
                <CardTitle className="text-card-foreground font-mono tracking-wide">RANKED MATCHES</CardTitle>
                <CardDescription className="font-mono text-sm">
                  Tournaments and ranked matches; Climb the leaderboards and prove you're a pro player!
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-2 border-primary/30 bg-card/50 backdrop-blur-sm glow-effect relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              <CardHeader className="relative z-10">
                <div className="relative mb-4">
                  <Gamepad2 className="h-12 w-12 text-primary" />
                  <div className="absolute inset-0 h-12 w-12 border border-primary/30 rotate-45"></div>
                </div>
                <CardTitle className="text-card-foreground font-mono tracking-wide">FUN AND ENJOYABLE</CardTitle>
                <CardDescription className="font-mono text-sm">
                  Enjoyable experiences in the game, with no limitations!
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Sign Up Modal */}
      <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Sign Up</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create your account to start playing UnnamedRoyaleGameV2
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username" className="text-card-foreground">
                Username
              </Label>
              <Input
                id="signup-username"
                placeholder="Enter your username"
                value={signUpData.username}
                onChange={(e) => setSignUpData((prev) => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-card-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                >
                  {showSignUpPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {signUpData.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground">Password Strength:</span>
                    <Badge variant={passwordStrength >= 75 ? "default" : "secondary"}>
                      {getStrengthText(passwordStrength)}
                    </Badge>
                  </div>
                  <Progress value={passwordStrength} className="h-2" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm" className="text-card-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-confirm"
                  type={showSignUpConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                >
                  {showSignUpConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/80 glow-effect"
              disabled={
                !signUpData.username ||
                !signUpData.password ||
                signUpData.password !== signUpData.confirmPassword ||
                passwordStrength < 50 ||
                isLoading
              }
              onClick={handleSignUp}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setShowSignUp(false)
                  setShowLogin(true)
                }}
                disabled={isLoading}
              >
                Login here
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Welcome Back</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Login to your account to continue playing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-card-foreground">
                Username
              </Label>
              <Input
                id="login-username"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
                disabled={isLoading}
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-card-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  className="bg-input border-border text-foreground pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={loginData.rememberMe}
                onCheckedChange={(checked) => setLoginData((prev) => ({ ...prev, rememberMe: !!checked }))}
                disabled={isLoading}
                className="border-white data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="remember-me" className="text-sm text-card-foreground">
                Remember me
              </Label>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/80 glow-effect"
              disabled={!loginData.username || !loginData.password || isLoading}
              onClick={handleLogin}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setShowLogin(false)
                  setShowSignUp(true)
                }}
                disabled={isLoading}
              >
                Sign up here
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
