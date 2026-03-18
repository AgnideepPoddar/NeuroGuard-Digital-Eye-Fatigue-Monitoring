import { Router, type IRouter } from "express";
import { eq, desc, avg, min, max, count, sql } from "drizzle-orm";
import { db, sessionsTable, fatigueMetricsTable, alertsTable } from "@workspace/db";
import {
  ListSessionsResponse,
  CreateSessionBody,
  GetSessionParams,
  GetSessionResponse,
  EndSessionParams,
  EndSessionBody,
  EndSessionResponse,
  GetSessionMetricsParams,
  GetSessionMetricsQueryParams,
  GetSessionMetricsResponse,
  RecordMetricParams,
  RecordMetricBody,
  GetSessionAlertsParams,
  GetSessionAlertsResponse,
  CreateAlertParams,
  CreateAlertBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.startedAt));
  res.json(ListSessionsResponse.parse(sessions));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      userName: parsed.data.userName,
      sessionType: parsed.data.sessionType,
    })
    .returning();

  res.status(201).json(GetSessionResponse.parse(session));
});

router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(GetSessionResponse.parse(session));
});

router.patch("/sessions/:sessionId", async (req, res): Promise<void> => {
  const params = EndSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = EndSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const metricsAgg = await db
    .select({
      avgEar: avg(fatigueMetricsTable.ear),
      avgPerclos: avg(fatigueMetricsTable.perclos),
    })
    .from(fatigueMetricsTable)
    .where(eq(fatigueMetricsTable.sessionId, params.data.sessionId));

  const alertsCount = await db
    .select({ cnt: count() })
    .from(alertsTable)
    .where(eq(alertsTable.sessionId, params.data.sessionId));

  const [session] = await db
    .update(sessionsTable)
    .set({
      status: body.data.status,
      endedAt: new Date(),
      avgEar: metricsAgg[0]?.avgEar ? parseFloat(metricsAgg[0].avgEar as string) : null,
      avgPerclos: metricsAgg[0]?.avgPerclos ? parseFloat(metricsAgg[0].avgPerclos as string) : null,
      totalAlerts: alertsCount[0]?.cnt ?? 0,
    })
    .where(eq(sessionsTable.id, params.data.sessionId))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(EndSessionResponse.parse(session));
});

router.get("/sessions/:sessionId/metrics", async (req, res): Promise<void> => {
  const params = GetSessionMetricsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = GetSessionMetricsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 100) : 100;

  const metrics = await db
    .select()
    .from(fatigueMetricsTable)
    .where(eq(fatigueMetricsTable.sessionId, params.data.sessionId))
    .orderBy(desc(fatigueMetricsTable.timestamp))
    .limit(limit);

  res.json(GetSessionMetricsResponse.parse(metrics));
});

router.post("/sessions/:sessionId/metrics", async (req, res): Promise<void> => {
  const params = RecordMetricParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RecordMetricBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [metric] = await db
    .insert(fatigueMetricsTable)
    .values({
      sessionId: params.data.sessionId,
      ear: body.data.ear,
      perclos: body.data.perclos,
      blinkRate: body.data.blinkRate,
      fatigueState: body.data.fatigueState,
    })
    .returning();

  res.status(201).json(metric);
});

router.get("/sessions/:sessionId/alerts", async (req, res): Promise<void> => {
  const params = GetSessionAlertsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const alerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.sessionId, params.data.sessionId))
    .orderBy(desc(alertsTable.timestamp));

  res.json(GetSessionAlertsResponse.parse(alerts));
});

router.post("/sessions/:sessionId/alerts", async (req, res): Promise<void> => {
  const params = CreateAlertParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateAlertBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [alert] = await db
    .insert(alertsTable)
    .values({
      sessionId: params.data.sessionId,
      alertType: body.data.alertType,
      message: body.data.message,
      ear: body.data.ear,
      perclos: body.data.perclos,
    })
    .returning();

  await db
    .update(sessionsTable)
    .set({ totalAlerts: sql`${sessionsTable.totalAlerts} + 1` })
    .where(eq(sessionsTable.id, params.data.sessionId));

  res.status(201).json(alert);
});

export default router;
