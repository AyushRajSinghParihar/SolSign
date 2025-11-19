import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Bot, Shield, MessageSquare, Lock, FileCheck } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Describe your contract in plain English. Our AI drafts professional legal documents in seconds, complete with standard clauses."
  },
  {
    icon: Bot,
    title: "Autonomous Negotiation",
    description: "Deploy an AI agent to negotiate via email on your behalf. Set your terms and let the agent handle back-and-forth discussions."
  },
  {
    icon: Shield,
    title: "On-Chain Proof",
    description: "Every signature is recorded on Solana blockchain. Immutable, verifiable, and cryptographically secure forever."
  },
  {
    icon: MessageSquare,
    title: "AI Clause Explanation",
    description: "Don't understand legal jargon? Select any clause and get instant plain-language explanations powered by AI."
  },
  {
    icon: Lock,
    title: "Secure Data Vault",
    description: "Store your information once, auto-fill multiple documents. Encrypted and accessible only by you with your wallet."
  },
  {
    icon: FileCheck,
    title: "Smart Templates",
    description: "Upload PDFs and let AI extract fillable fields automatically. Reuse templates across multiple agreements instantly."
  }
]

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12 md:mb-20 max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight"
          >
            Why Choose SolSignAI?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            We combine cutting-edge AI with blockchain technology to revolutionize how you create, negotiate, and sign documents.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ feature, index }: { feature: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="group relative h-full border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 overflow-hidden">
        {/* Holographic Corner Accents */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader>
          <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 w-fit group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
            <feature.icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
            {feature.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground leading-relaxed">
          {feature.description}
        </CardContent>
        
        {/* Neon Border Fade-in */}
        <div className="absolute inset-0 border border-primary/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-500 pointer-events-none" />
      </Card>
    </motion.div>
  )
}
