import { Layout } from "@/components/layout";
import { useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, Search, Filter, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function Sessions() {
  const { data: sessions, isLoading, error } = useListSessions();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full w-full flex items-center justify-center">
          <Activity className="w-12 h-12 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !sessions) {
    return (
      <Layout>
        <div className="h-full w-full flex flex-col items-center justify-center text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-display">Failed to load sessions</h2>
        </div>
      </Layout>
    );
  }

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || s.sessionType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Session History</h1>
          <p className="text-muted-foreground mt-1">Review past monitoring instances</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search user..."
              className="bg-card/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <select 
              className="bg-card/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors appearance-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="driving">Driving</option>
              <option value="development">Development</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSessions.map(session => (
          <Link key={session.id} href={`/sessions/${session.id}`}>
            <div className="glass-panel p-6 rounded-3xl hover:border-primary/50 transition-all duration-300 cursor-pointer group hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{session.userName}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{session.sessionType} Session</p>
                </div>
                {session.status === 'active' ? (
                  <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full bg-primary/20 text-primary border border-primary/30">Active</span>
                ) : (
                  <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full bg-white/5 text-muted-foreground border border-white/10">Completed</span>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Started:</span>
                  <span className="text-foreground">{format(new Date(session.startedAt), 'MMM d, HH:mm')}</span>
                </div>
                {session.endedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ended:</span>
                    <span className="text-foreground">{format(new Date(session.endedAt), 'HH:mm')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Avg EAR</p>
                  <p className="font-mono text-lg text-foreground">
                    {session.avgEar ? session.avgEar.toFixed(3) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Alerts</p>
                  <p className={`font-mono text-lg ${session.totalAlerts > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {session.totalAlerts}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filteredSessions.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/20 rounded-3xl border border-white/5 border-dashed">
            No sessions found matching your filters.
          </div>
        )}
      </div>
    </Layout>
  );
}
