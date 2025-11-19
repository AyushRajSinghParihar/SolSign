import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

export function TrustBadges() {
  const badges = [
    { icon: CheckCircle2, text: "Solana Blockchain", color: "text-green-500", border: "group-hover:border-green-500/50" },
    { icon: CheckCircle2, text: "Gemini AI Powered", color: "text-blue-500", border: "group-hover:border-blue-500/50" },
    { icon: CheckCircle2, text: "Open Source", color: "text-purple-500", border: "group-hover:border-purple-500/50" },
  ]

  return (
    <div className="w-full py-8 border-y border-white/5 bg-black/5 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`group flex items-center gap-3 px-6 py-2.5 rounded-full bg-background/50 border border-white/10 transition-colors duration-300 ${badge.border}`}
            >
              <badge.icon className={`h-4 w-4 ${badge.color}`} />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {badge.text}
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

