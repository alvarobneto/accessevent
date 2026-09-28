import { registerAs } from '@nestjs/config';

import { validateConfig } from './env.validation.js';

export const databaseConfig = registerAs(
  'database',
  () => validateConfig(process.env).database,
);
