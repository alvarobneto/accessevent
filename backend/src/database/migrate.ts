import { Logger } from '@nestjs/common';

import { appDataSource } from './data-source.js';

const MIGRATION_COMMANDS = ['run', 'revert', 'show'] as const;

type MigrationCommand = (typeof MIGRATION_COMMANDS)[number];

/**
 * Runner de migrações em JavaScript compilado. O container de runtime remove as
 * devDependencies, então o CLI do TypeORM (que precisa de `ts-node`) não existe
 * lá dentro — `node dist/database/migrate.js <comando>` funciona nos dois lados.
 */
async function main(): Promise<void> {
  const logger = new Logger('Migrations');
  const command = process.argv[2] ?? 'run';

  if (!MIGRATION_COMMANDS.includes(command as MigrationCommand)) {
    throw new Error(
      `Comando inválido: "${command}". Use um de: ${MIGRATION_COMMANDS.join(', ')}.`,
    );
  }

  await appDataSource.initialize();

  try {
    if (command === 'revert') {
      await appDataSource.undoLastMigration({ transaction: 'all' });
      logger.log('Última migração revertida.');
      return;
    }

    if (command === 'show') {
      const hasPending = await appDataSource.showMigrations();
      logger.log(
        hasPending ? 'Existem migrações pendentes.' : 'Banco atualizado.',
      );
      return;
    }

    const applied = await appDataSource.runMigrations({ transaction: 'all' });

    if (applied.length === 0) {
      logger.log('Banco já estava atualizado.');
      return;
    }

    for (const migration of applied) {
      logger.log(`Aplicada: ${migration.name}`);
    }
  } catch (error) {
    logger.error('Falha ao aplicar as migrações.', error as Error);
    process.exitCode = 1;
  } finally {
    await appDataSource.destroy();
  }
}

await main();
