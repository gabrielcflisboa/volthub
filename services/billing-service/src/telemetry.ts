// Bootstrap do OpenTelemetry (carregado com `node --import ./dist/telemetry.js` antes da aplicação).
// Traces, métricas e logs vão por OTLP para o coletor (grafana/otel-lgtm).
// Métricas e traces são configurados pelas variáveis OTEL_* (ver docker-compose.yml).
import { register } from 'node:module';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';

// Hook de ESM: permite instrumentar módulos carregados com `import` (fastify, kafkajs, pg)
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      // consultas ao banco sem um trace "pai" (jobs de polling) não viram traces soltos
      '@opentelemetry/instrumentation-pg': { requireParentSpan: true },
    }),
  ],
  logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
});

sdk.start();
process.on('SIGTERM', () => void sdk.shutdown());
