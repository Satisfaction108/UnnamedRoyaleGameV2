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
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.077.077 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export default function HomePage() {
  const [showSignUp, setShowSignUp] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedServer, setSelectedServer] = useState("1v1")
  const { toast } = useToast()

  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

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

  if (isAuthenticated && currentUser) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-balance">UnnamedRoyaleGameV2</h1>
              </div>
              <div className="flex items-center gap-3 ml-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="h-12 w-12 bg-card/80 hover:bg-primary/20 border border-border/50 neon-border"
                >
                  <Settings className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscordClick}
                  className="h-12 w-12 bg-card/80 hover:bg-primary/20 border border-border/50 neon-border"
                >
                  <DiscordIcon className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChangelog(true)}
                  className="h-12 w-12 bg-card/80 hover:bg-primary/20 border border-border/50 neon-border"
                >
                  <FileText className="h-6 w-6" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Welcome back, </span>
                <span className="font-semibold text-primary">{currentUser.username}</span>
              </div>
              <Button variant="outline" onClick={() => setShowLogoutConfirm(true)}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Player Stats - Left */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <CardTitle className="text-primary">Player Stats</CardTitle>
                <CardDescription>Your gaming performance</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 space-y-2">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <Badge variant="secondary">{currentUser.level}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Games Played:</span>
                  <span>{currentUser.gamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wins:</span>
                  <span className="text-primary font-semibold">{currentUser.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Win Rate:</span>
                  <span>
                    {currentUser.gamesPlayed > 0 ? Math.round((currentUser.wins / currentUser.gamesPlayed) * 100) : 0}%
                  </span>
                </div>
              </div>
            </Card>

            {/* Battle - Center */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <CardTitle className="text-center text-2xl text-primary">Battle</CardTitle>
                <CardDescription className="text-center">Choose your game mode and fight!</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="text-center">
                    <Label htmlFor="server-select" className="text-base font-medium">
                      Gamemode
                    </Label>
                  </div>
                  <div className="flex justify-center">
                    <Select value={selectedServer} onValueChange={setSelectedServer}>
                      <SelectTrigger id="server-select" className="bg-input border-border w-full max-w-xs">
                        <SelectValue placeholder="Select game mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1v1">1v1</SelectItem>
                        <SelectItem value="2v2">2v2</SelectItem>
                        <SelectItem value="3v3">3v3</SelectItem>
                        <SelectItem value="Battle Royale">Battle Royale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full h-12 text-lg bg-primary hover:bg-primary/80 glow-effect">
                  <Play className="mr-2 h-5 w-5" />
                  Enter Battle
                </Button>
              </div>
            </Card>

            {/* Leaderboard - Right */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <CardTitle className="text-accent">Leaderboard</CardTitle>
                <CardDescription>Top players worldwide</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0">
                <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                  <Trophy className="h-12 w-12 mb-4 opacity-50" />
                  <p>No leaderboard data available</p>
                  <p className="text-sm mt-2">Check back soon!</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetContent side="left" className="w-[480px] bg-sidebar border-sidebar-border">
            <SheetHeader className="px-2">
              <SheetTitle className="text-sidebar-foreground">Settings</SheetTitle>
              <SheetDescription className="text-sidebar-foreground/70">
                Manage your account and preferences
              </SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="account" className="mt-6 px-2">
              <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent">
                <TabsTrigger value="account" className="data-[state=active]:bg-sidebar-primary">
                  Account
                </TabsTrigger>
                <TabsTrigger value="logout" className="data-[state=active]:bg-sidebar-primary">
                  Logout
                </TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="space-y-4 mt-4">
                <div className="space-y-4 px-2">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-sidebar-foreground">Account Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-sidebar-foreground/70">Username:</span>
                        <span className="font-medium text-sidebar-foreground">{currentUser.username}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sidebar-foreground/70">Level:</span>
                        <Badge variant="secondary">{currentUser.level}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sidebar-foreground/70">Member since:</span>
                        <span className="text-sidebar-foreground">
                          {new Date(currentUser.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sidebar-foreground/70">Games played:</span>
                        <span className="text-sidebar-foreground">{currentUser.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sidebar-foreground/70">Wins:</span>
                        <span className="text-primary font-semibold">{currentUser.wins}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-sidebar-border pt-4">
                    <h3 className="text-lg font-semibold mb-3 text-sidebar-foreground">Reset Password</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-password" className="text-sidebar-foreground">
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
                            className="bg-input border-sidebar-border text-sidebar-foreground pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4 text-sidebar-foreground/70" />
                            ) : (
                              <Eye className="h-4 w-4 text-sidebar-foreground/70" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-sidebar-foreground">
                          New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={resetPasswordData.newPassword}
                            onChange={(e) => setResetPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                            className="bg-input border-sidebar-border text-sidebar-foreground pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-sidebar-foreground/70" />
                            ) : (
                              <Eye className="h-4 w-4 text-sidebar-foreground/70" />
                            )}
                          </Button>
                        </div>
                        {resetPasswordData.newPassword && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-sidebar-foreground/70">Password Strength:</span>
                              <Badge variant={resetPasswordStrength >= 75 ? "default" : "secondary"}>
                                {getStrengthText(resetPasswordStrength)}
                              </Badge>
                            </div>
                            <Progress value={resetPasswordStrength} className="h-2" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-new-password" className="text-sidebar-foreground">
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
                            className="bg-input border-sidebar-border text-sidebar-foreground pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          >
                            {showConfirmNewPassword ? (
                              <EyeOff className="h-4 w-4 text-sidebar-foreground/70" />
                            ) : (
                              <Eye className="h-4 w-4 text-sidebar-foreground/70" />
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
                        className="w-full bg-sidebar-primary hover:bg-sidebar-primary/80"
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
                    <h3 className="text-lg font-semibold mb-2 text-sidebar-foreground">
                      Are you sure you want to logout?
                    </h3>
                    <p className="text-sm text-sidebar-foreground/70">
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
                      className="w-full bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                      onClick={() => setShowSettings(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>

        <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
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
                <p className="text-sm text-muted-foreground">
                  The game is released as a beta version.
                </p>
              </div>
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
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-balance">
            <span className="text-primary glow-effect">UnnamedRoyaleGameV2</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Battle for victory in UnnamedRoyaleGameV2.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8 bg-primary hover:bg-primary/80 glow-effect"
              onClick={() => setShowSignUp(true)}
            >
              <Zap className="mr-2 h-5 w-5" />
              Sign Up
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12 text-primary">Game Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-card-foreground">Various Gamemodes</CardTitle>
                <CardDescription>1v1, 2v2, 3v3, Battle Royale, and much more!</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <Trophy className="h-12 w-12 text-accent mb-4" />
                <CardTitle className="text-card-foreground">Ranked Matches</CardTitle>
                <CardDescription>
                  Tournaments and ranked matches; Climb the leaderboards and prove you're a pro player!
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm glow-effect">
              <CardHeader>
                <Gamepad2 className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-card-foreground">Fun and Enjoyable</CardTitle>
                <CardDescription>Enjoyable experiences in the game, with no limitations!</CardDescription>
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
