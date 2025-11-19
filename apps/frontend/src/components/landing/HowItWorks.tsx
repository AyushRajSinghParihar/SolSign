import { motion } from 'framer-motion'

const steps = [
  {
    number: "01",
    title: "Create or Upload",
    description: "Generate a contract with AI or upload your existing template document."
  },
  {
    number: "02",
    title: "Collaborate & Negotiate",
    description: "Invite parties to sign or deploy an AI agent to negotiate terms automatically."
  },
  {
    number: "03",
    title: "Sign & Secure",
    description: "All parties sign with their wallets, and the proof is sealed on the blockchain."
  }
]

export function HowItWorks() {
  return (
    <section className="py-32 bg-black/5 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
          >
            How It Works
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Three simple steps to secure document signing
          </motion.p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-1/2"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StepCard({ step, index }: { step: any, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.2 }}
      className="relative flex flex-col items-center text-center space-y-6"
    >
      <div className="relative z-10 group">
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-background border border-white/10 shadow-xl group-hover:scale-110 transition-transform duration-500">
          <span className="text-3xl font-bold bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">
            {step.number}
          </span>
          {/* Neon Edges */}
          <div className="absolute inset-0 rounded-2xl border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-bold">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}

