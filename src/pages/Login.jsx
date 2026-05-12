import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <svg version="1.1" viewBox="0 0 1988 791" height="44" style={{ width: 'auto' }} xmlns="http://www.w3.org/2000/svg">
            <path fill="#77C63E" d="M1621.351074,265.402985 C1601.311401,277.257141 1581.208618,277.886932 1562.143921,265.116058 C1543.174805,252.409164 1535.406738,233.766068 1538.866089,211.017044 C1542.682617,185.919266 1565.158447,166.801773 1590.911621,166.320068 C1616.870117,165.834534 1640.453857,184.285583 1644.993042,209.280472 C1649.258423,232.768234 1641.072021,251.418396 1621.351074,265.402985z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-1">Talli</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">Per Diem Tracker</p>

        {sent ? (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
            <p className="text-sm font-semibold text-primary mb-1">Check your email</p>
            <p className="text-xs text-muted-foreground">
              We sent a sign-in link to{' '}
              <span className="font-medium text-foreground">{email}</span>.
              Tap it to open the app.
            </p>
            <button
              className="mt-4 text-xs text-muted-foreground underline"
              onClick={() => setSent(false)}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold gap-3"
              onClick={handleGoogle}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-muted border-0"
                required
              />
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 rounded-xl font-semibold"
              >
                {loading ? 'Sending…' : 'Send sign-in link'}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              No password needed — we'll email you a one-tap link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
