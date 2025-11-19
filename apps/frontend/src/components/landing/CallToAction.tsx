import { motion } from 'framer-motion'
import { AuthButton } from '@/components/AuthButton'

export function CallToAction() {
  return (
    <section className="py-32 px-4 md:px-6 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 p-8 md:p-24 text-center"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,119,198,0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
          
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
              Ready to revolutionize your workflow?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect your wallet and start creating secure, AI-powered contracts today.
              No credit card required.
            </p>
            <div className="flex justify-center pt-8">
              <div className="scale-125">
                <AuthButton />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

