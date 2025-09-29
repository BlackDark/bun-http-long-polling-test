import { logger } from "./logger";
import { trace } from "@opentelemetry/api";

if (process.env.FRAMEWORK === "hono") {
  // Dynamically import Hono variant
  import("./server-hono").then((module) => {
    const { app } = module;
    const server = Bun.serve({
      fetch: app.fetch,
      port: 3000,
      idleTimeout: 0,
    });
    logger.info(`Hono server running on http://localhost:${server.port}`);
  });
} else {
  // Plain Bun variant
  const server = Bun.serve({
    port: 3000,
    idleTimeout: 0,
    async fetch(req) {
      const url = new URL(req.url);
      logger.info(`Received request: ${req.method} ${url.pathname}`);
      if (url.pathname === "/" || url.pathname === "/health") {
        logger.debug("Health check request");
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.pathname === "/poll") {
        const timeout = parseInt(
          url.searchParams.get("timeout") || "10000",
          10
        );
        const interval = parseInt(
          url.searchParams.get("interval") || "500",
          10
        );
        logger.info(
          `Starting poll with timeout=${timeout}ms, interval=${interval}ms`
        );
        const stream = new ReadableStream({
          start(controller) {
            let elapsed = 0;
            const sendMessage = () => {
              if (elapsed >= timeout) {
                logger.info("Poll timeout reached, closing stream");
                controller.close();
                return;
              }
              const data = `data: ${JSON.stringify({
                message: `Message at ${elapsed}ms`,
                timestamp: Date.now(),
                elapsed,
              })}\n\n`;
              logger.debug(`Sending message at ${elapsed}ms`);
              controller.enqueue(new TextEncoder().encode(data));
              elapsed += interval;
              setTimeout(sendMessage, interval);
            };
            sendMessage();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      if (url.pathname === "/test-logs") {
        const tracer = trace.getTracer("bun-server");
        return tracer.startActiveSpan("HTTP GET /test-logs", (span) => {
          try {
            logger.info("Test info log");
            logger.warn("Test warn log");
            logger.error("Test error log");
            logger.debug("Test debug log");
            span.end();
            return new Response(JSON.stringify({ message: "Logs tested" }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error: any) {
            span.recordException(error);
            span.end();
            throw error;
          }
        });
      }
      if (url.pathname === "/metrics") {
        const metricsData = {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: Date.now(),
        };
        return new Response(JSON.stringify(metricsData), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },
  });
  logger.info(`Plain Bun server running on http://localhost:${server.port}`);
}
