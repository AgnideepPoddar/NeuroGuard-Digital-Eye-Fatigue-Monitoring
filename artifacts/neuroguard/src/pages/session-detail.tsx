import { Layout } from "@/components/layout";
import { useGetSessionAnalytics } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Activity, ShieldAlert, ChevronLeft, Clock, Eye, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { formatTime } from "@/lib/utils";

export default function SessionDetail() {
  const { id } = useParams();
  const { data: analytics, isLoading, error } = useGetSessionAnalytics(Number(id));

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full w-full flex items-center justify-center">
          <Activity className="w-12 h-12 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !analytics) {
    return (
      <Layout>
        <div className="h-full w-full flex flex-col items-center justify-center text-destructive">
          <ShieldAlert className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-display">Failed to load session details</h2>
          <Link href="/sessions" className="mt-4 text-primary hover:underline">Return to sessions</Link>
        </div>
      </Layout>
    );
  }

  const stateData = [
    { name: 'Alert', value: analytics.stateDistribution.alert, color: 'hsl(var(--primary))' },
    { name: 'Drowsy', value: analytics.stateDistribution.drowsy, color: 'hsl(var(--warning))' },
    { name: 'Fatigued', value: analytics.stateDistribution.fatigued, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  const timeSeriesData = analytics.metricsTimeSeries.map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm:ss'),
    ear: m.ear,
    perclos: m.perclos * 100
  }));

  return (
    <Layout>
      <div className="mb-8">
        <Link href="/sessions" className="text-sm text-primary hover:underline flex items-center mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Sessions
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{analytics.userName}'s Session</h1>
            <p className="text-muted-foreground mt-1 capitalize">{analytics.sessionType} Analysis</p>
          </div>
          <div className="px-4 py-2 bg-card/50 rounded-xl border border-white/5 flex items-center shadow-lg">
            <Clock className="w-4 h-4 text-primary mr-2" />
            <span className="font-mono text-sm">{formatTime(analytics.duration)}</span>
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Alerts</p>
          <p className="text-2xl font-display font-bold text-warning">{analytics.totalAlerts}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg EAR</p>
          <p className="text-2xl font-display font-bold text-foreground font-mono">{analytics.avgEar.toFixed(3)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Min: {analytics.minEar.toFixed(3)}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg PERCLOS</p>
          <p className="text-2xl font-display font-bold text-foreground font-mono">{(analytics.avgPerclos * 100).toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Max: {(analytics.maxPerclos * 100).toFixed(1)}%</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Blink Rate</p>
          <p className="text-2xl font-display font-bold text-foreground font-mono">{analytics.avgBlinkRate}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Blinks per min</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl">
          <h3 className="text-lg font-display text-foreground mb-6 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-primary" /> EAR Timeline
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{fill: '#94a3b8', fontSize: 12}} tickMargin={10} />
                <YAxis domain={[0, 0.5]} tick={{fill: '#94a3b8', fontSize: 12}} />
                <ReferenceLine y={0.28} stroke="hsl(var(--warning))" strokeDasharray="3 3" opacity={0.8} />
                <ReferenceLine y={0.20} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.8} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Line type="monotone" dataKey="ear" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl flex flex-col">
          <h3 className="text-lg font-display text-foreground mb-4">Fatigue State Distribution</h3>
          <div className="flex-1 min-h-[200px]">
            {stateData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No state data available
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {stateData.map(s => (
              <div key={s.name}>
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color }} />
                <div className="text-xs text-muted-foreground">{s.name}</div>
                <div className="font-mono text-sm">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Detailed metrics table could go here if needed, but charts provide better overview */}
    </Layout>
  );
}
