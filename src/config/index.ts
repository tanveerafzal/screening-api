import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // API key for authenticating incoming requests
  apiKey: z.string(),

  // Backend selection
  screeningBackend: z.enum(['yente', 'hosted']).default('yente'),

  // Yente configuration
  yenteBaseUrl: z.string().url().default('http://localhost:8000'),

  // Hosted OpenSanctions API configuration
  openSanctionsApiUrl: z
    .string()
    .url()
    .default('https://api.opensanctions.org'),
  openSanctionsApiKey: z.string().optional(),

  // Request configuration
  requestTimeoutMs: z.coerce.number().default(30000),
  maxBatchSize: z.coerce.number().default(50),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Cove Webhook
  coveWebhookUrl: z.string().url().optional(),
  coveWebhookApiKey: z.string().optional(),
});

const configInput = {
  port: process.env['PORT'],
  nodeEnv: process.env['NODE_ENV'],
  apiKey: process.env['API_KEY'],
  screeningBackend: process.env['SCREENING_BACKEND'],
  yenteBaseUrl: process.env['YENTE_BASE_URL'],
  openSanctionsApiUrl: process.env['OPENSANCTIONS_API_URL'],
  openSanctionsApiKey: process.env['OPENSANCTIONS_API_KEY'],
  requestTimeoutMs: process.env['REQUEST_TIMEOUT_MS'],
  maxBatchSize: process.env['MAX_BATCH_SIZE'],
  rateLimitWindowMs: process.env['RATE_LIMIT_WINDOW_MS'],
  rateLimitMaxRequests: process.env['RATE_LIMIT_MAX_REQUESTS'],
  logLevel: process.env['LOG_LEVEL'],
  coveWebhookUrl: process.env['COVE_WEBHOOK_URL'],
  coveWebhookApiKey: process.env['COVE_WEBHOOK_API_KEY'],
};

const parsed = configSchema.safeParse(configInput);

if (!parsed.success) {
  console.error('Invalid configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export type Config = z.infer<typeof configSchema>;
