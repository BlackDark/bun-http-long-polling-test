import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { logger } from "./logger";
import { trace, metrics } from "@opentelemetry/api";
import { otel } from "@hono/otel";
import { prometheus } from "@hono/prometheus";

const app = new Hono();
const { printMetrics, registerMetrics } = prometheus();

app.use("*", otel({}));
app.use("*", registerMetrics);
app.get("/metrics", printMetrics);

app.get("/", (c) => {
  logger.info("Root endpoint accessed");
  return c.json({ status: "ok" });
});

app.get("/health", (c) => {
  logger.info("Health check accessed");
  return c.json({ status: "ok" });
});

app.get("/test-logs", (c) => {
  const tracer = trace.getTracer("hono-server");
  return tracer.startActiveSpan("HTTP GET /test-logs", (span) => {
    try {
      logger.info("Test info log");
      logger.warn("Test warn log");
      logger.error("Test error log");
      logger.debug("Test debug log");
      span.end();
      return c.json({ message: "Logs tested" });
    } catch (error: any) {
      span.recordException(error);
      span.end();
      throw error;
    }
  });
});

app.get("/sse-hono-otel", async (c) => {
  const tracer = trace.getTracer("hono-server");
  return tracer.startActiveSpan("HTTP GET /poll", async (span) => {
    try {
      const timeout = parseInt(c.req.query("timeout") || "10000", 10);
      const interval = parseInt(c.req.query("interval") || "500", 10);
      span.setAttribute("http.method", "GET");
      span.setAttribute("http.url", c.req.url);
      span.setAttribute("poll.timeout", timeout);
      span.setAttribute("poll.interval", interval);
      span.setAttribute("http.status_code", 200);
      logger.info(
        `Starting SSE with timeout=${timeout}ms and interval=${interval}ms`
      );
      return streamSSE(c, async (stream) => {
        let elapsed = 0;
        while (elapsed < timeout) {
          try {
            logger.debug(`Sending SSE message at ${elapsed}ms`);
            await stream.writeln(
              `event: message\ndata: ${JSON.stringify({
                message: `Message at ${elapsed}ms`,
                timestamp: Date.now(),
                elapsed,
              })}\n\n`
            );
          } catch (error: any) {
            logger.error("Error sending SSE message, client disconnected", {
              error: error?.message || "Unknown error",
            });
            // Client disconnected, stop streaming
            span.end();
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, interval));
          elapsed += interval;
        }
        logger.info("SSE stream ended");
        span.end();
      });
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: 1, message: error.message });
      span.end();
      throw error;
    }
  });
});

app.get("/test-hono-otel", (c) => {
  logger.info("Test info log");
  logger.warn("Test warn log");
  logger.error("Test error log");
  logger.debug("Test debug log");
  return c.json({ message: "Logs tested" });
});

app.get("/sse", async (c) => {
  const timeout = parseInt(c.req.query("timeout") || "10000", 10);
  const interval = parseInt(c.req.query("interval") || "500", 10);
  logger.info(
    `Starting SSE with timeout=${timeout}ms and interval=${interval}ms`
  );
  return streamSSE(c, async (stream) => {
    let elapsed = 0;
    while (elapsed < timeout) {
      try {
        logger.debug(`Sending SSE message at ${elapsed}ms`);
        await stream.writeln(
          `event: message\ndata: ${JSON.stringify({
            message: `Message at ${elapsed}ms`,
            timestamp: Date.now(),
            elapsed,
          })}\n\n`
        );
      } catch (error: any) {
        logger.error("Error sending SSE message, client disconnected", {
          error: error?.message || "Unknown error",
        });
        // Client disconnected, stop streaming
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      elapsed += interval;
    }
    logger.info("SSE stream ended");
  });
});

app.get("/long-poll", async (c) => {
  const timeout = parseInt(c.req.query("timeout") || "10000", 10);
  logger.info(`Starting long poll with timeout=${timeout}ms.`);

  await new Promise((resolve) => setTimeout(resolve, timeout));
  return c.json({ message: "Long poll completed" });
});

export { app };
