import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthButton } from '@/components/AuthButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Sparkles,
  Bot,
  Shield,
  MessageSquare,
  Lock,
  FileCheck,
  Zap,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/10">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute top-0 z-[-2] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight">SolSignAI</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium rounded-full border bg-background/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-yellow-500 fill-yellow-500" />
              <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent font-semibold">
                New: AI Agent Negotiation
              </span>
            </Badge>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Intelligent Contracts.
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Secured on Solana.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Generate legal documents with AI, negotiate autonomously, and seal agreements with immutable blockchain proof. The future of signing is here.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <div className="scale-110">
                 <AuthButton />
              </div>
              <Button variant="outline" size="lg" onClick={scrollToFeatures} className="h-11 px-8 text-base group">
                Learn More
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground animate-in fade-in duration-1000 delay-500">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Solana Blockchain</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span>Gemini AI Powered</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <span>Open Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-muted/30 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Why Choose SolSignAI?</h2>
            <p className="text-muted-foreground text-lg">
              We combine cutting-edge AI with blockchain technology to revolutionize how you create, negotiate, and sign documents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-6 w-6 text-primary" />}
              title="AI-Powered Generation"
              description="Describe your contract in plain English. Our AI drafts professional legal documents in seconds, complete with standard clauses."
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6 text-primary" />}
              title="Autonomous Negotiation"
              description="Deploy an AI agent to negotiate via email on your behalf. Set your terms and let the agent handle back-and-forth discussions."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-primary" />}
              title="On-Chain Proof"
              description="Every signature is recorded on Solana blockchain. Immutable, verifiable, and cryptographically secure forever."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6 text-primary" />}
              title="AI Clause Explanation"
              description="Don't understand legal jargon? Select any clause and get instant plain-language explanations powered by AI."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6 text-primary" />}
              title="Secure Data Vault"
              description="Store your information once, auto-fill multiple documents. Encrypted and accessible only by you with your wallet."
            />
            <FeatureCard
              icon={<FileCheck className="h-6 w-6 text-primary" />}
              title="Smart Templates"
              description="Upload PDFs and let AI extract fillable fields automatically. Reuse templates across multiple agreements instantly."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to secure document signing
            </p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-muted via-primary/20 to-muted" />

            <StepCard
              number="1"
              title="Create or Upload"
              description="Generate a contract with AI or upload your existing template document."
            />
            <StepCard
              number="2"
              title="Collaborate & Negotiate"
              description="Invite parties to sign or deploy an AI agent to negotiate terms automatically."
            />
            <StepCard
              number="3"
              title="Sign & Secure"
              description="All parties sign with their wallets, and the proof is sealed on the blockchain."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
            <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Ready to revolutionize your workflow?
              </h2>
              <p className="text-xl text-muted-foreground">
                Connect your wallet and start creating secure, AI-powered contracts today.
                No credit card required.
              </p>
              <div className="flex justify-center pt-4">
                <div className="scale-110">
                  <AuthButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg">SolSignAI</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              © 2025 SolSignAI. Powered by Solana & Gemini.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="group border-muted/60 bg-background/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader>
        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 w-fit group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground leading-relaxed">
        {description}
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-transparent hover:border-muted transition-colors">
      <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-background border-2 border-primary/20 shadow-sm text-2xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
        {number}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}
