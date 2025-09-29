import winston from "winston";
import CloudWatchTransport from "winston-cloudwatch";
import { trace, context } from "@opentelemetry/api";

const addTraceInfo = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
  }
  return info;
});

const transports: winston.transport | winston.transport[] | undefined = [
  new winston.transports.Console(),
];

// probably do not work because requires credentials directly
if (process.env.LOG_DESTINATION === "cloudwatch") {
  transports.push(
    new CloudWatchTransport({
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP || "bun-app-logs",
      logStreamName:
        process.env.CLOUDWATCH_LOG_STREAM || `instance-${Date.now()}`,
      awsRegion: process.env.AWS_REGION || "eu-central-1",
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    addTraceInfo(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
});
