import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
const TLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="64" height="64">
    <circle cx="50" cy="50" r="50" fill="#77C63E"/>
    <text x="50" y="68" fontFamily="system-ui,sans-serif" fontSize="52" fontWeight="bold" fill="white" textAnchor="middle">T</text>
  </svg>
)

const GoogleButton = ({ onClick }) => (
  <Button type="button" variant="outline" className="w-full h-12 rounded-xl font-semibold gap-3" onClick={onClick}>
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
    Continue with Google
  </Button>
)

const Divider = () => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-muted-foreground">or</span>
    <div className="flex-1 h-px bg-border" />
  </div>
)

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [signUpDone, setSignUpDone] = useState(false)

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) toast.error('Incorrect email or password')
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else setSignUpDone(true)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else setResetSent(true)
  }

  const switchMode = (next) => {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setSignUpDone(false)
  }

  // Reset password screen
  if (showReset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8"><TLogo /></div>
          <h1 className="text-2xl font-bold text-foreground text-center mb-1">Reset Password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">We'll email you a link to set a new password</p>
          {resetSent ? (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
              <p className="text-sm font-semibold text-primary mb-1">Check your email</p>
              <p className="text-xs text-muted-foreground">Click the link to set a new password, then sign in here.</p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <Input type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold">
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <button className="w-full mt-4 text-xs text-muted-foreground underline"
            onClick={() => { setShowReset(false); setResetSent(false) }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // Sign up success screen
  if (signUpDone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-8"><TLogo /></div>
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-8">
            <p className="text-lg font-bold text-primary mb-2">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
            </p>
          </div>
          <button className="w-full mt-6 text-xs text-muted-foreground underline"
            onClick={() => switchMode('signin')}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><TLogo /></div>
        <h1 className="text-2xl font-bold text-foreground text-center mb-1">Talli</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Per Diem Tracker</p>

        {/* Mode toggle */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Create account
          </button>
        </div>

        <div className="space-y-4">
          <GoogleButton onClick={handleGoogle} />
          <Divider />

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <Input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Button type="submit" disabled={loading || !email || !password}
                className="w-full h-12 rounded-xl font-semibold">
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <button type="button" className="w-full text-xs text-muted-foreground underline"
                onClick={() => setShowReset(true)}>
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <Input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Input type="password" placeholder="Password (min 8 characters)" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Input type="password" placeholder="Confirm password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0" required />
              <Button type="submit" disabled={loading || !email || !password || !confirmPassword}
                className="w-full h-12 rounded-xl font-semibold">
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
