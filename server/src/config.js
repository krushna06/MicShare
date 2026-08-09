const { z } = require('zod');
const { loadEnv } = require('@micshare/shared/src/env');

const serverConfigSchema = z.object({
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3020),
  SERVER_URL: z.string().url().default('https://micapi.nostep.space'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  AUTH_SECRET: z.string().min(16),
  AUTH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(1209600).default(86400),
});

function getServerConfig(env = process.env) {
  loadEnv();
  const parsed = serverConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid server configuration: ${issues}`);
  }
  return parsed.data;
}

module.exports = { getServerConfig, serverConfigSchema };
