import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useFaceMesh } from "@/hooks/use-face-mesh";
import { useCreateSession, useEndSession, useRecordMetric, useCreateAlert, CreateSessionRequestSessionType } from "@workspace/api-client-react";
import { Play, Square, AlertTriangle, Eye, Activity, Brain, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatTime } from "@/lib/utils";

export default function LiveMonitor() {
  const [userName, setUserName] = useState("User_01");
  const [sessionType, setSessionType] = useState<CreateSessionRequestSessionType>("driving");
  
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionTime, setSessionTime] = useState(0);

  const { 
    videoRef, 
    canvasRef, 
    isReady, 
    currentEar, 
    currentPerclos, 
    blinkRate, 
    fatigueState,
    history 
  } = useFaceMesh(!!activeSessionId);

  // Mutations
  const { mutateAsync: createSession, isPending: isCreating } = useCreateSession();
  const { mutateAsync: endSession, isPending: isEnding } = useEndSession();
  const { mutateAsync: recordMetric } = useRecordMetric();
  const { mutateAsync: createAlert } = useCreateAlert();

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSessionId) {
      interval = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeSessionId]);

  // Metric recording loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSessionId && isReady) {
      interval = setInterval(() => {
        recordMetric({
          sessionId: activeSessionId,
          data: {
            ear: currentEar,
            perclos: currentPerclos,
            blinkRate,
            fatigueState
          }
        }).catch(err => console.error("Failed to record metric", err));
      }, 2000); // Every 2 seconds
    }
    return () => clearInterval(interval);
  }, [activeSessionId, isReady, currentEar, currentPerclos, blinkRate, fatigueState, recordMetric]);

  // Alert generation
  useEffect(() => {
    if (activeSessionId && isReady && (fatigueState === 'drowsy' || fatigueState === 'fatigued')) {
      const alertType = fatigueState === 'fatigued' ? 'fatigued' : 'drowsy';
      createAlert({
        sessionId: activeSessionId,
        data: {
          alertType,
          message: `${alertType.toUpperCase()} state detected. EAR: ${currentEar.toFixed(2)}, PERCLOS: ${(currentPerclos * 100).toFixed(1)}%`,
          ear: currentEar,
          perclos: currentPerclos
        }
      }).catch(err => console.error("Failed to create alert", err));
    }
  }, [fatigueState, activeSessionId, isReady]); // Intentionally omitting others to avoid spam, in reality we'd debounce this.

  const handleStart = async () => {
    try {
      const session = await createSession({ data: { userName, sessionType } });
      setActiveSessionId(session.id);
      setSessionTime(0);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const handleStop = async () => {
    if (!activeSessionId) return;
    try {
      await endSession({ sessionId: activeSessionId, data: { status: "completed" } });
      setActiveSessionId(null);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  // Prepare chart data
  const chartData = history.slice(-60).map((h, i) => ({
    time: i,
    ear: Number(h.ear.toFixed(3))
  }));

  const stateColors = {
    alert: "text-primary border-primary bg-primary/10",
    drowsy: "text-warning border-warning bg-warning/10",
    fatigued: "text-destructive border-destructive bg-destructive/10"
  };

  const stateShadows = {
    alert: "neon-glow-cyan",
    drowsy: "neon-glow-amber",
    fatigued: "neon-glow-red"
  };

  return (
    <Layout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Live Monitoring</h1>
          <p className="text-muted-foreground mt-1">Real-time landmark analysis & fatigue classification</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-card/50 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            disabled={!!activeSessionId}
            className="bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            placeholder="User Name"
          />
          <select
            value={sessionType}
            onChange={e => setSessionType(e.target.value as CreateSessionRequestSessionType)}
            disabled={!!activeSessionId}
            className="bg-background/50 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 appearance-none"
          >
            <option value="driving">Driving</option>
            <option value="development">Development</option>
            <option value="general">General</option>
          </select>
          
          {activeSessionId ? (
            <button
              onClick={handleStop}
              disabled={isEnding}
              className="flex items-center px-6 py-2 bg-destructive/20 text-destructive border border-destructive/50 rounded-xl font-medium hover:bg-destructive hover:text-white transition-all neon-glow-red"
            >
              <Square className="w-4 h-4 mr-2" />
              End Session
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isCreating}
              className="flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Monitoring
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Video Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-3xl overflow-hidden glass-panel aspect-video bg-black flex items-center justify-center">
            {/* Base Video Element */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover opacity-0"
              playsInline
            />
            {/* Canvas Overlay for WebGL / MediaPipe drawing */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover z-10"
              width={640}
              height={480}
            />
            
            {!activeSessionId && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Brain className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <p className="text-xl font-display text-muted-foreground">Session Inactive</p>
                <p className="text-sm text-muted-foreground mt-2">Start monitoring to initialize neural tracking</p>
              </div>
            )}

            {activeSessionId && !isReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Activity className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-display text-primary animate-pulse">Calibrating Model...</p>
              </div>
            )}
            
            {/* Top HUD overlay */}
            {isReady && (
              <div className="absolute top-4 left-4 z-30 flex items-center space-x-3">
                <div className="px-3 py-1 bg-black/50 border border-white/10 rounded-full flex items-center backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                  <span className="text-xs font-mono text-white tracking-widest">REC</span>
                </div>
                <div className="px-3 py-1 bg-black/50 border border-white/10 rounded-full flex items-center backdrop-blur-md">
                  <Clock className="w-3 h-3 text-primary mr-2" />
                  <span className="text-xs font-mono text-white">{formatTime(sessionTime)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Chart */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-lg font-display mb-6 flex items-center text-foreground">
              <Activity className="w-5 h-5 mr-2 text-primary" />
              Real-time EAR Signal (Last 60s)
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0.1, 0.5]} hide />
                  <ReferenceLine y={0.28} stroke="hsl(var(--warning))" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={0.20} stroke="hsl(var(--destructive))" strokeDasharray="3 3" opacity={0.5} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00e5ff' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ear" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Metrics */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {activeSessionId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "rounded-3xl border-2 p-8 flex flex-col items-center justify-center transition-all duration-500",
                  stateColors[fatigueState],
                  stateShadows[fatigueState]
                )}
              >
                <div className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">Current State</div>
                <div className="text-5xl font-display font-bold uppercase tracking-widest">
                  {fatigueState}
                </div>
                {fatigueState !== 'alert' && (
                  <div className="mt-4 flex items-center text-sm font-medium animate-pulse">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Warning detected
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass-panel rounded-3xl p-6 space-y-8">
            <h3 className="text-lg font-display text-foreground border-b border-white/5 pb-4">Live Metrics</h3>
            
            {/* EAR Metric */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Eye className="w-4 h-4 mr-2" />
                  Eye Aspect Ratio (EAR)
                </div>
                <span className="font-mono text-xl text-foreground font-medium">{currentEar.toFixed(3)}</span>
              </div>
              <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    currentEar < 0.2 ? "bg-destructive" : currentEar < 0.28 ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(Math.max((currentEar - 0.1) / 0.3 * 100, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>Closed (0.1)</span>
                <span>Open (0.4)</span>
              </div>
            </div>

            {/* PERCLOS Metric */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2" />
                  PERCLOS (60s)
                </div>
                <span className="font-mono text-xl text-foreground font-medium">{(currentPerclos * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-white/5 flex">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    currentPerclos > 0.3 ? "bg-destructive" : currentPerclos > 0.15 ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(currentPerclos * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>Alert</span>
                <span>Drowsy (&gt;15%)</span>
                <span>Fatigued (&gt;30%)</span>
              </div>
            </div>

            {/* Blink Rate */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Activity className="w-4 h-4 mr-2" />
                  Blink Rate
                </div>
                <span className="font-mono text-xl text-foreground font-medium">{blinkRate} <span className="text-xs text-muted-foreground">bpm</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
