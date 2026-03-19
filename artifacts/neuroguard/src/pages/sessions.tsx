import { Layout } from "@/components/layout";
import { useListSessions, useDeleteSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, Search, Filter, ShieldAlert, Trash2, X, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function DeleteConfirmModal({
  sessionName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  sessionName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="relative z-10 glass-panel rounded-3xl p-8 w-full max-w-sm mx-4 border border-destructive/30 shadow-[0_0_40px_rgba(255,23,68,0.15)]"
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground mb-2">Delete Session</h3>
          <p className="text-sm text-muted-foreground mb-1">
            You are about to permanently delete the session for
          </p>
          <p className="text-sm font-semibold text-foreground mb-6">"{sessionName}"</p>
          <p className="text-xs text-muted-foreground mb-6">
            All metrics and alerts associated with this session will be deleted. This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/80 transition-all disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Sessions() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading, error } = useListSessions();
  const { mutateAsync: deleteSession, isPending: isDeleting } = useDeleteSession();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

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

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    // Optimistically remove from cache instantly
    const queryKey = getListSessionsQueryKey();
    const prev = queryClient.getQueryData<typeof sessions>(queryKey);
    queryClient.setQueryData(queryKey, (old: typeof sessions) =>
      old ? old.filter(s => s.id !== id) : old
    );
    setConfirmDelete(null);
    try {
      await deleteSession({ sessionId: id });
      queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      // Roll back on failure
      queryClient.setQueryData(queryKey, prev);
      console.error("Failed to delete session", e);
    }
  };

  return (
    <Layout>
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmModal
            sessionName={confirmDelete.name}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setConfirmDelete(null)}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Session History</h1>
          <p className="text-muted-foreground mt-1">Review and manage past monitoring instances</p>
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
          <div key={session.id} className="relative group">
            <Link href={`/sessions/${session.id}`}>
              <div className="glass-panel p-6 rounded-3xl hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{session.userName}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{session.sessionType} · {session.modelType.replace('_', '+').toUpperCase()}</p>
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

            {/* Delete button — floats over top-right, appears on hover */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDelete({ id: session.id, name: session.userName });
              }}
              className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-card/80 border border-white/10 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-all duration-200 backdrop-blur-sm"
              title="Delete session"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
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
