import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Executa um `SELECT 1` para confirmar que o PostgreSQL está acessível.
   * Nunca lança: o `/health` precisa responder mesmo com o banco fora do ar.
   */
  async ping(): Promise<{ status: 'up' | 'down'; latencyMs: number | null }> {
    if (!this.dataSource.isInitialized) {
      this.logger.warn('Health check executado antes da conexão com o banco.');
      return { status: 'down', latencyMs: null };
    }

    const startedAt = process.hrtime.bigint();

    try {
      await this.dataSource.query('SELECT 1');
      const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      return { status: 'up', latencyMs: Math.round(latencyMs * 100) / 100 };
    } catch (error) {
      this.logger.error('Falha ao consultar o banco de dados.', error);
      return { status: 'down', latencyMs: null };
    }
  }
}
