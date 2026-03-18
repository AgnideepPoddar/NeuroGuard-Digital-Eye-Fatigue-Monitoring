import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { BrainCircuit } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="h-full w-full flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
        
        <BrainCircuit className="w-24 h-24 text-primary opacity-50 mb-8 animate-pulse" />
        <h1 className="text-6xl font-display font-bold text-foreground mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">404</h1>
        <h2 className="text-2xl text-muted-foreground mb-8 text-center max-w-md">
          Neural pathway interrupted. The requested module could not be located.
        </h2>
        
        <Link 
          href="/" 
          className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all neon-glow-cyan"
        >
          Return to Monitoring
        </Link>
      </div>
    </Layout>
  );
}
