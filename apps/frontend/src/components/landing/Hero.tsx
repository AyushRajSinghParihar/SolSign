import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AuthButton } from '@/components/AuthButton'
import { ChevronRight, Zap, FileText, Shield, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Hero() {
  const { scrollY } = useScroll()
  const y2 = useTransform(scrollY, [0, 500], [0, -150])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        <ParticleDust />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-start text-left space-y-8"
        >
          <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium rounded-full border bg-background/50 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 mr-1.5 text-yellow-500 fill-yellow-500" />
            <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent font-semibold">
              New: AI Agent Negotiation
            </span>
          </Badge>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Intelligent Contracts.
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Secured on Solana.
              </span>
              <motion.div 
                className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600 rounded-full opacity-50 blur-sm"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Generate legal documents with AI, negotiate autonomously, and seal agreements with immutable blockchain proof.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200" />
              <div className="relative bg-background rounded-lg">
                 <AuthButton />
              </div>
            </div>
            <Button variant="outline" size="lg" className="h-11 px-8 text-base group border-primary/20 hover:bg-primary/5">
              Learn More
              <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>

        {/* Hologram Card */}
        <motion.div 
          style={{ y: y2 }}
          initial={{ opacity: 0, scale: 0.8, rotateX: 10 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative hidden lg:block perspective-1000"
        >
          <HologramCard />
        </motion.div>
      </div>
    </section>
  )
}

function ParticleDust() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-primary/20 rounded-full"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            y: [null, Math.random() * -100 + "%"],
            opacity: [null, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            width: Math.random() * 4 + 1 + "px",
            height: Math.random() * 4 + 1 + "px",
          }}
        />
      ))}
    </div>
  )
}

function HologramCard() {
  return (
    <motion.div
      whileHover={{ rotateY: 5, rotateX: -5 }}
      className="relative w-full max-w-md mx-auto aspect-[3/4] bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Glass Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      
      {/* Content Mockup */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="h-2 w-24 bg-white/10 rounded" />
              <div className="h-1.5 w-16 bg-white/5 rounded" />
            </div>
          </div>
          <div className="h-6 w-16 bg-green-500/20 rounded-full border border-green-500/30" />
        </div>

        <div className="space-y-3">
          <div className="h-2 w-full bg-white/5 rounded" />
          <div className="h-2 w-5/6 bg-white/5 rounded" />
          <div className="h-2 w-4/6 bg-white/5 rounded" />
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
          <div className="flex items-center gap-2 text-xs text-primary">
            <Bot className="h-3 w-3" />
            <span>AI Analysis</span>
          </div>
          <div className="h-1.5 w-full bg-primary/10 rounded" />
          <div className="h-1.5 w-5/6 bg-primary/10 rounded" />
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium">Blockchain Verified</span>
            </div>
            <div className="h-2 w-20 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

