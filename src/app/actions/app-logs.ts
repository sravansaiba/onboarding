"use server";

import { getSupabaseAdmin, requireSuperAdmin, type ActionResult } from "./supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = "info" | "warning" | "error";
export type LogStatus = "success" | "failed";
export type LogType = "audit" | "api" | "system";

export type AppLogRecord = {
  id: string;
  level: LogLevel;
  source: string;
  event_type: string;
  actor_id: string | null;
  restaurant_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: LogStatus;
  message: string;
  metadata: Record<string, unknown>;
  duration_ms: number | null;
  status_code: number | null;
  http_method: string | null;
  http_path: string | null;
  log_type: LogType;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Write inputs
// ---------------------------------------------------------------------------

type BaseLogInput = {
  level?: LogLevel;
  source: string;
  actorId?: string | null;
  restaurantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status?: LogStatus;
  message: string;
  metadata?: Record<string, unknown>;
};

/** Audit log — business events like "restaurant approved", "setting deleted" */
type AuditLogInput = BaseLogInput & {
  eventType: string;
};

/** API log — automatic request-level logging from loggedAction wrapper */
type ApiLogInput = BaseLogInput & {
  eventType?: string;
  durationMs: number;
  statusCode: number;
  httpMethod: string;
  httpPath: string;
};

// ---------------------------------------------------------------------------
// List options
// ---------------------------------------------------------------------------

type ListLogOptions = {
  accessToken: string;
  restaurantId?: string;
  source?: string;
  level?: LogLevel | "all";
  logType?: LogType | "all";
  statusCode?: number;
  query?: string;
  limit?: number;
  offset?: number;
};

type ListLogResult = {
  records: AppLogRecord[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// Core write functions
// ---------------------------------------------------------------------------

/** Write an audit log entry (business events). Fire-and-forget — never throws. */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("app_logs").insert({
      log_type: "audit",
      level: input.level ?? "info",
      source: input.source,
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      restaurant_id: input.restaurantId ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      status: input.status ?? "success",
      message: input.message,
      metadata: input.metadata ?? {},
      duration_ms: null,
      status_code: null,
      http_method: null,
      http_path: null,
    });
  } catch {
    // Logging should never break the main flow
    console.error("[writeAuditLog] Failed silently:", input.source, input.eventType);
  }
}

/** Write an API request log entry. Fire-and-forget — never throws. */
async function writeApiLog(input: ApiLogInput): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("app_logs").insert({
      log_type: "api",
      level: input.level ?? (input.statusCode >= 500 ? "error" : input.statusCode >= 400 ? "warning" : "info"),
      source: input.source,
      event_type: input.eventType ?? "api.request",
      actor_id: input.actorId ?? null,
      restaurant_id: input.restaurantId ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      status: input.status ?? (input.statusCode < 400 ? "success" : "failed"),
      message: input.message,
      metadata: input.metadata ?? {},
      duration_ms: input.durationMs,
      status_code: input.statusCode,
      http_method: input.httpMethod,
      http_path: input.httpPath,
    });
  } catch {
    console.error("[writeApiLog] Failed silently:", input.source, input.statusCode);
  }
}

// ---------------------------------------------------------------------------
// Backward compat — keep old writeAppLog working until all callsites migrate
// ---------------------------------------------------------------------------

type LegacyWriteLogInput = {
  level?: LogLevel;
  source: string;
  eventType: string;
  actorId?: string | null;
  restaurantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status?: LogStatus;
  message: string;
  metadata?: Record<string, unknown>;
};

/** @deprecated Use writeAuditLog instead */
export async function writeAppLog(input: LegacyWriteLogInput): Promise<void> {
  return writeAuditLog(input);
}

// ---------------------------------------------------------------------------
// loggedAction — the production wrapper for server actions
// ---------------------------------------------------------------------------

type LoggedActionConfig = {
  /** Action name e.g. "createRestaurant" */
  actionName: string;
  /** HTTP method equivalent: GET for reads, POST for creates, PUT for updates, DELETE for deletes */
  httpMethod: "GET" | "POST" | "PUT" | "DELETE";
  /** Logical path e.g. "/restaurants" or "/restaurant-settings/:key" */
  httpPath: string;
  /** Actor ID — set after auth if not known upfront */
  actorId?: string | null;
  /** Restaurant scope */
  restaurantId?: string | null;
};

/**
 * Production-grade server action wrapper.
 *
 * - Automatically times every call (duration_ms)
 * - Logs success with 200 status code
 * - Logs errors with appropriate status codes (401, 403, 400, 500)
 * - Classifies errors by type (auth, validation, server)
 * - All writes are fire-and-forget — never blocks the response
 *
 * Usage:
 * ```ts
 * export async function myAction(token: string) {
 *   return loggedAction(
 *     { actionName: "myAction", httpMethod: "GET", httpPath: "/my-resource" },
 *     async (ctx) => {
 *       const actor = await requireSuperAdmin(token);
 *       ctx.actorId = actor.id;
 *       // ... your logic
 *       return { ok: true, data: result };
 *     }
 *   );
 * }
 * ```
 */
export async function loggedAction<T>(
  config: LoggedActionConfig,
  fn: (ctx: LoggedActionConfig) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  const start = Date.now();
  const ctx = { ...config };

  try {
    const result = await fn(ctx);
    const durationMs = Date.now() - start;

    // Determine status code from result
    const statusCode = result.ok ? 200 : 400;

    // Always log writes; only log failed reads
    const shouldLog = ctx.httpMethod !== "GET" || !result.ok;

    if (shouldLog) {
      void writeApiLog({
        source: ctx.actionName,
        httpMethod: ctx.httpMethod,
        httpPath: ctx.httpPath,
        statusCode,
        durationMs,
        actorId: ctx.actorId,
        restaurantId: ctx.restaurantId,
        status: result.ok ? "success" : "failed",
        message: result.ok
          ? `${ctx.actionName} completed in ${durationMs}ms`
          : (result as { error: string }).error,
        metadata: {
          duration_ms: durationMs,
          ...(!result.ok && { error: (result as { error: string }).error }),
        },
      });
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : "Internal server error";

    // Classify the error into an HTTP-like status code
    const statusCode = classifyErrorCode(errorMessage);

    void writeApiLog({
      source: ctx.actionName,
      httpMethod: ctx.httpMethod,
      httpPath: ctx.httpPath,
      statusCode,
      durationMs,
      level: statusCode >= 500 ? "error" : "warning",
      status: "failed",
      actorId: ctx.actorId,
      restaurantId: ctx.restaurantId,
      message: errorMessage,
      metadata: {
        duration_ms: durationMs,
        error_type: error instanceof Error ? error.constructor.name : "UnknownError",
        stack: error instanceof Error ? error.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
      },
    });

    // Re-return as ActionResult so callers don't crash
    return { ok: false, error: errorMessage };
  }
}

/** Map error messages to HTTP-like status codes */
function classifyErrorCode(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes("sign in") || lower.includes("session expired") || lower.includes("access token")) return 401;
  if (lower.includes("super admin") || lower.includes("only a") || lower.includes("permission") || lower.includes("not allowed")) return 403;
  if (lower.includes("not found")) return 404;
  if (lower.includes("already exists") || lower.includes("duplicate") || lower.includes("conflict")) return 409;
  if (lower.includes("required") || lower.includes("invalid") || lower.includes("cannot") || lower.includes("must")) return 422;
  return 500;
}

// ---------------------------------------------------------------------------
// List / query logs — for the admin dashboard
// ---------------------------------------------------------------------------

export async function listAppLogs(options: ListLogOptions): Promise<ActionResult<ListLogResult>> {
  try {
    await requireSuperAdmin(options.accessToken);
    const admin = getSupabaseAdmin();
    const limit = Math.min(Math.max(options.limit ?? 50, 10), 500);
    const offset = Math.max(options.offset ?? 0, 0);

    let query = admin
      .from("app_logs")
      .select(
        "id, level, source, event_type, actor_id, restaurant_id, entity_type, entity_id, status, message, metadata, duration_ms, status_code, http_method, http_path, log_type, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.restaurantId) {
      query = query.eq("restaurant_id", options.restaurantId);
    }

    if (options.source?.trim()) {
      query = query.eq("source", options.source.trim());
    }

    if (options.level && options.level !== "all") {
      query = query.eq("level", options.level);
    }

    if (options.logType && options.logType !== "all") {
      query = query.eq("log_type", options.logType);
    }

    if (options.statusCode) {
      query = query.eq("status_code", options.statusCode);
    }

    if (options.query?.trim()) {
      const search = `%${options.query.trim()}%`;
      query = query.or(`message.ilike.${search},event_type.ilike.${search},source.ilike.${search}`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      ok: true,
      data: {
        records: (data ?? []) as AppLogRecord[],
        totalCount: count ?? 0,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load logs.",
    };
  }
}
