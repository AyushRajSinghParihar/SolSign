import { FileText } from 'lucide-react'
import { motion } from 'framer-motion'

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black py-12 overflow-hidden">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/5 p-1.5 border border-white/10">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">SolSignAI</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>

          <p className="text-sm text-muted-foreground text-center md:text-right">
            © 2025 SolSignAI. Powered by Solana & Gemini.
          </p>
        </div>
        
        {/* Animated Solana Bar */}
        <motion.div 
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-50"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </footer>
  )
}

