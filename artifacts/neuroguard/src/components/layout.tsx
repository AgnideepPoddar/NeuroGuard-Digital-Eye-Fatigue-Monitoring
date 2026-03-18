import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Video, List, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { name: "Live Monitor", path: "/", icon: Video },
    { name: "Analytics", path: "/analytics", icon: BarChart2 },
    { name: "Sessions", path: "/sessions", icon: List },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/5 bg-card/40 backdrop-blur-xl flex flex-col z-20">
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <BrainCircuit className="w-8 h-8 text-primary mr-3" />
          <span className="font-display font-bold text-xl tracking-wider text-foreground">
            NEURO<span className="text-primary">GUARD</span>
          </span>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            
            return (
              <Link key={item.name} href={item.path} className="block">
                <div
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                    isActive 
                      ? "bg-primary/10 text-primary neon-glow-cyan" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5 mr-4 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary")} />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="font-mono">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-screen overflow-hidden">
        {/* Subtle decorative background elements */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
