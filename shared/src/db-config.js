const { z } = require('zod');
const { loadEnv } = require('./env');

const dbConfigSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
});

function getDbConfig(env = process.env) {
  loadEnv();
  const parsed = dbConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid database configuration: ${issues}`);
  }
  return parsed.data;
}

module.exports = { getDbConfig, dbConfigSchema };
