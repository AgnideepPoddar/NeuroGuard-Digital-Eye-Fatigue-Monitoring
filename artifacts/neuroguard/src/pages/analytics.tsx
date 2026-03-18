import { Layout } from "@/components/layout";
import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, AlertTriangle, Eye, ShieldAlert, Clock, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { format } from "date-fns";

export default function Analytics() {
  const { data: summary, isLoading, error } = useGetAnalyticsSummary();

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full w-full flex items-center justify-center">
          <Activity className="w-12 h-12 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !summary) {
    return (
      <Layout>
        <div className="h-full w-full flex flex-col items-center justify-center text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-display">Failed to load analytics</h2>
        </div>
      </Layout>
    );
  }

  const alertData = [
    { name: 'Drowsy', value: summary.alertsByType.drowsy, color: 'hsl(var(--warning))' },
    { name: 'Fatigued', value: summary.alertsByType.fatigued, color: 'hsl(var(--destructive))' },
    { name: 'Microsleep', value: summary.alertsByType.microsleep, color: '#9f1239' },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Global Analytics</h1>
        <p className="text-muted-foreground mt-1">Aggregate insights across all monitoring sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <Activity className="w-16 h-16 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Sessions</p>
          <p className="text-4xl font-display font-bold text-foreground">{summary.totalSessions}</p>
          <div className="mt-4 flex items-center text-xs text-primary bg-primary/10 w-fit px-2 py-1 rounded-md">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {summary.activeSessions} active now
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <AlertTriangle className="w-16 h-16 text-warning" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Alerts</p>
          <p className="text-4xl font-display font-bold text-warning">{summary.totalAlerts}</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <Eye className="w-16 h-16 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Average EAR</p>
          <p className="text-4xl font-display font-bold text-foreground font-mono">{summary.avgEar.toFixed(3)}</p>
        </div>

        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <Clock className="w-16 h-16 text-destructive" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Avg PERCLOS</p>
          <p className="text-4xl font-display font-bold text-foreground font-mono">{(summary.avgPerclos * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-display text-foreground">Recent Sessions</h3>
            <Link href="/sessions" className="text-sm text-primary hover:underline flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-background/50">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">User</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Started</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentSessions.slice(0, 5).map((session) => (
                  <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{session.userName}</td>
                    <td className="px-6 py-4 capitalize text-muted-foreground">{session.sessionType}</td>
                    <td className="px-6 py-4 text-muted-foreground">{format(new Date(session.startedAt), 'MMM d, HH:mm')}</td>
                    <td className="px-6 py-4">
                      {session.status === 'active' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary border border-primary/30">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-muted-foreground border border-white/20">Completed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sessions/${session.id}`} className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary hover:text-primary-foreground transition-all">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
                {summary.recentSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No sessions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
          <h3 className="text-lg font-display text-foreground mb-6">Alerts by Type</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {alertData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
