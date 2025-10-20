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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">SolSignAI</span>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-6 py-24 space-y-8 text-center">
        <Badge variant="secondary" className="mx-auto">
          <Zap className="h-3 w-3 mr-1" />
          Powered by AI + Blockchain
        </Badge>

        <h1 className="text-5xl font-bold tracking-tight lg:text-6xl max-w-4xl mx-auto">
          Intelligent, Secure Document Signing
          <br />
          <span className="text-primary">on the Blockchain</span>
        </h1>

        <p className="mx-auto max-w-2xl text-xl text-muted-foreground leading-relaxed">
          Generate contracts with AI, negotiate autonomously, and seal agreements
          with immutable blockchain proof. The future of legal documents is here.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <AuthButton />
          <Button variant="outline" size="lg" onClick={scrollToFeatures}>
            Learn More
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="flex gap-8 justify-center items-center pt-8 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Solana Blockchain</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Gemini AI</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Open Source</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 md:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Why SolSignAI?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Combining cutting-edge AI with blockchain technology to revolutionize how you create, negotiate, and sign documents
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1: AI Generation */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>AI-Powered Generation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Describe your contract in plain English. Our AI drafts professional
              legal documents in seconds, complete with standard clauses and proper formatting.
            </CardContent>
          </Card>

          {/* Feature 2: Autonomous Negotiation */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Autonomous Negotiation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Deploy an AI agent to negotiate via email on your behalf. Set your
              terms and let the agent handle back-and-forth discussions intelligently.
            </CardContent>
          </Card>

          {/* Feature 3: Blockchain Proof */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>On-Chain Proof</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Every signature is recorded on Solana blockchain. Immutable,
              verifiable, and cryptographically secure forever. No central authority needed.
            </CardContent>
          </Card>

          {/* Feature 4: Explain Clauses */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>AI Clause Explanation</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Don't understand legal jargon? Select any clause and get instant
              plain-language explanations powered by AI. Sign with confidence.
            </CardContent>
          </Card>

          {/* Feature 5: Data Vault */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Secure Data Vault</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Store your information once, auto-fill multiple documents.
              Encrypted and accessible only by you with your wallet signature.
            </CardContent>
          </Card>

          {/* Feature 6: Template System */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="rounded-full bg-primary/10 p-3 w-fit mb-4">
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Smart Templates</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Upload PDFs and let AI extract fillable fields automatically. Reuse templates
              across multiple agreements instantly, saving hours of work.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg">
            Three simple steps to secure document signing
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="mx-auto rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold">Create or Upload</h3>
            <p className="text-muted-foreground">
              Generate a contract with AI or upload your existing template document
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold">Collaborate & Negotiate</h3>
            <p className="text-muted-foreground">
              Invite parties to sign or deploy an AI agent to negotiate terms automatically
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold">Sign & Secure</h3>
            <p className="text-muted-foreground">
              All parties sign with their wallets, and the proof is sealed on the blockchain
            </p>
          </div>
        </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 md:px-6 py-24 text-center">
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 max-w-4xl mx-auto">
          <CardContent className="py-16 space-y-6">
            <h2 className="text-4xl font-bold">
              Ready to revolutionize your document workflow?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect your wallet and start creating secure, AI-powered contracts today.
              No credit card required. No monthly fees.
            </p>
            <div className="pt-4">
              <AuthButton />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-bold">SolSignAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 SolSignAI. Powered by Solana, Gemini AI, and innovation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

