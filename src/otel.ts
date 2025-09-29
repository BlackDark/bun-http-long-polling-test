import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import logsAPI from "@opentelemetry/api-logs";

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import {
  ATTR_K8S_POD_NAME,
  ATTR_K8S_POD_UID,
} from "@opentelemetry/semantic-conventions/incubating";

const enabledOtelDiagnose = process.env.ENABLED_OTEL_DIAGNOSE === "true";

if (enabledOtelDiagnose) {
  // For troubleshooting, set the log level to DiagLogLevel.DEBUG
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "bun-application",
  [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "1.0.0",
  [ATTR_K8S_POD_NAME]: process.env.K8S_POD_NAME,
  [ATTR_K8S_POD_UID]: process.env.K8S_POD_UID,
});

// Configure logs pipeline
const loggerProvider = new LoggerProvider({
  resource,
  processors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
});

logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

// Configure the SDK with auto-instrumentation
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: new OTLPTraceExporter(),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10000, // Export every 10 seconds
    }),
    new PrometheusExporter({
      port: 9464,
    }),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-winston": {
        disableLogCorrelation: false,
        disableLogSending: false,
      },
    }),
  ],
});

// Start the SDK
sdk.start();

// Bun doesn't correctly handle process exit signals by default,
// so we need a way to properly shut down the SDK
const shutdownSignals = ["SIGTERM", "SIGINT", "SIGQUIT"];

// Gracefully shut down the SDK on termination signals
for (const signal of shutdownSignals) {
  process.on(signal, () => {
    sdk
      .shutdown()
      .then(() => console.log("OpenTelemetry SDK shut down successfully"))
      .catch((error) =>
        console.error("Error shutting down OpenTelemetry SDK", error)
      )
      .finally(() => {
        process.exit(0);
      });
  });
}

// Handle uncaught exceptions with graceful shutdown but no success log
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  sdk
    .shutdown()
    .catch((shutdownError) =>
      console.error("Error shutting down OpenTelemetry SDK", shutdownError)
    )
    .finally(() => {
      process.exit(1);
    });
});
