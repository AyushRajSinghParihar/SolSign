import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthButton } from '@/components/AuthButton'
import { FileText } from 'lucide-react'
import { Hero } from '@/components/landing/Hero'
import { TrustBadges } from '@/components/landing/TrustBadges'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CallToAction } from '@/components/landing/CallToAction'
import { Footer } from '@/components/landing/Footer'

export function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="rounded-lg bg-primary/10 p-1.5 border border-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">SolSignAI</span>
          </div>
          <AuthButton />
        </div>
      </header>

      <main>
        <Hero />
        <TrustBadges />
        <Features />
        <HowItWorks />
        <CallToAction />
      </main>

      <Footer />
    </div>
  )
}
