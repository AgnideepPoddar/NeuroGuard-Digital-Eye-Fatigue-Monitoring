import { Router, type IRouter } from "express";
import { eq, avg, min, max, count, sql } from "drizzle-orm";
import { db, sessionsTable, fatigueMetricsTable, alertsTable } from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetSessionAnalyticsParams,
  GetSessionAnalyticsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const totalSessionsResult = await db
    .select({ cnt: count() })
    .from(sessionsTable);

  const activeSessionsResult = await db
    .select({ cnt: count() })
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "active"));

  const totalAlertsResult = await db
    .select({ cnt: count() })
    .from(alertsTable);

  const metricsAgg = await db
    .select({
      avgEar: avg(fatigueMetricsTable.ear),
      avgPerclos: avg(fatigueMetricsTable.perclos),
    })
    .from(fatigueMetricsTable);

  const drowsyAlerts = await db
    .select({ cnt: count() })
    .from(alertsTable)
    .where(eq(alertsTable.alertType, "drowsy"));

  const fatiguedAlerts = await db
    .select({ cnt: count() })
    .from(alertsTable)
    .where(eq(alertsTable.alertType, "fatigued"));

  const microsleepAlerts = await db
    .select({ cnt: count() })
    .from(alertsTable)
    .where(eq(alertsTable.alertType, "microsleep"));

  const recentSessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(sql`${sessionsTable.startedAt} desc`)
    .limit(5);

  const summary = {
    totalSessions: Number(totalSessionsResult[0]?.cnt ?? 0),
    activeSessions: Number(activeSessionsResult[0]?.cnt ?? 0),
    totalAlerts: Number(totalAlertsResult[0]?.cnt ?? 0),
    avgEar: metricsAgg[0]?.avgEar ? parseFloat(metricsAgg[0].avgEar as string) : 0,
    avgPerclos: metricsAgg[0]?.avgPerclos ? parseFloat(metricsAgg[0].avgPerclos as string) : 0,
    alertsByType: {
      drowsy: Number(drowsyAlerts[0]?.cnt ?? 0),
      fatigued: Number(fatiguedAlerts[0]?.cnt ?? 0),
      microsleep: Number(microsleepAlerts[0]?.cnt ?? 0),
    },
    recentSessions,
  };

  res.json(GetAnalyticsSummaryResponse.parse(summary));
});

router.get("/analytics/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetSessionAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sessionId } = params.data;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const metricsAgg = await db
    .select({
      avgEar: avg(fatigueMetricsTable.ear),
      minEar: min(fatigueMetricsTable.ear),
      avgPerclos: avg(fatigueMetricsTable.perclos),
      maxPerclos: max(fatigueMetricsTable.perclos),
      avgBlinkRate: avg(fatigueMetricsTable.blinkRate),
      totalMetrics: count(),
    })
    .from(fatigueMetricsTable)
    .where(eq(fatigueMetricsTable.sessionId, sessionId));

  const alertsAgg = await db
    .select({ cnt: count() })
    .from(alertsTable)
    .where(eq(alertsTable.sessionId, sessionId));

  const alertByType = await db
    .select({
      alertType: alertsTable.alertType,
      cnt: count(),
    })
    .from(alertsTable)
    .where(eq(alertsTable.sessionId, sessionId))
    .groupBy(alertsTable.alertType);

  const stateDistribution = await db
    .select({
      fatigueState: fatigueMetricsTable.fatigueState,
      cnt: count(),
    })
    .from(fatigueMetricsTable)
    .where(eq(fatigueMetricsTable.sessionId, sessionId))
    .groupBy(fatigueMetricsTable.fatigueState);

  const metricsTimeSeries = await db
    .select()
    .from(fatigueMetricsTable)
    .where(eq(fatigueMetricsTable.sessionId, sessionId))
    .orderBy(fatigueMetricsTable.timestamp)
    .limit(500);

  const endTime = session.endedAt ?? new Date();
  const duration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);

  const stateMap: Record<string, number> = { alert: 0, drowsy: 0, fatigued: 0 };
  for (const s of stateDistribution) {
    stateMap[s.fatigueState] = Number(s.cnt);
  }

  const alertTypeMap: Record<string, number> = { drowsy: 0, fatigued: 0, microsleep: 0 };
  for (const a of alertByType) {
    alertTypeMap[a.alertType] = Number(a.cnt);
  }

  const analytics = {
    sessionId,
    userName: session.userName,
    sessionType: session.sessionType,
    duration,
    totalMetrics: Number(metricsAgg[0]?.totalMetrics ?? 0),
    totalAlerts: Number(alertsAgg[0]?.cnt ?? 0),
    avgEar: metricsAgg[0]?.avgEar ? parseFloat(metricsAgg[0].avgEar as string) : 0,
    minEar: metricsAgg[0]?.minEar ? parseFloat(metricsAgg[0].minEar as string) : 0,
    avgPerclos: metricsAgg[0]?.avgPerclos ? parseFloat(metricsAgg[0].avgPerclos as string) : 0,
    maxPerclos: metricsAgg[0]?.maxPerclos ? parseFloat(metricsAgg[0].maxPerclos as string) : 0,
    avgBlinkRate: metricsAgg[0]?.avgBlinkRate ? parseFloat(metricsAgg[0].avgBlinkRate as string) : 0,
    stateDistribution: {
      alert: stateMap.alert,
      drowsy: stateMap.drowsy,
      fatigued: stateMap.fatigued,
    },
    alertsByType: {
      drowsy: alertTypeMap.drowsy,
      fatigued: alertTypeMap.fatigued,
      microsleep: alertTypeMap.microsleep,
    },
    metricsTimeSeries,
  };

  res.json(GetSessionAnalyticsResponse.parse(analytics));
});

export default router;
