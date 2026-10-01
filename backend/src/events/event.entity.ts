import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Evento do PRD §23. `organizerId` e `imageUrl` ficam de fora até existirem
 * `User` (RF01) e storage.
 */
@Entity({ name: 'events' })
@Index('events_name_idx', ['name'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  // O driver do PostgreSQL já devolve colunas `date` como `YYYY-MM-DD`.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
