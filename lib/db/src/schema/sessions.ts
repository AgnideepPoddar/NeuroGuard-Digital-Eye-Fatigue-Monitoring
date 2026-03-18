import { pgTable, text, serial, timestamp, integer, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionTypeEnum = pgEnum("session_type", ["driving", "development", "general"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed"]);
export const fatigueStateEnum = pgEnum("fatigue_state", ["alert", "drowsy", "fatigued"]);
export const alertTypeEnum = pgEnum("alert_type", ["drowsy", "fatigued", "microsleep"]);

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  sessionType: sessionTypeEnum("session_type").notNull().default("general"),
  status: sessionStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  totalAlerts: integer("total_alerts").notNull().default(0),
  avgEar: real("avg_ear"),
  avgPerclos: real("avg_perclos"),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, startedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;

export const fatigueMetricsTable = pgTable("fatigue_metrics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  ear: real("ear").notNull(),
  perclos: real("perclos").notNull(),
  blinkRate: real("blink_rate").notNull(),
  fatigueState: fatigueStateEnum("fatigue_state").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFatigueMetricSchema = createInsertSchema(fatigueMetricsTable).omit({ id: true, timestamp: true });
export type InsertFatigueMetric = z.infer<typeof insertFatigueMetricSchema>;
export type FatigueMetric = typeof fatigueMetricsTable.$inferSelect;

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  alertType: alertTypeEnum("alert_type").notNull(),
  message: text("message").notNull(),
  ear: real("ear").notNull(),
  perclos: real("perclos").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, timestamp: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
