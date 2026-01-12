import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('group_projections', { schema: 'messaging' })
@Index(['isActive'])
@Index(['lastSyncedAt'])
export class GroupProjection {
  @PrimaryColumn('uuid', { name: 'group_id' })
  groupId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', name: 'picture_url', nullable: true })
  pictureUrl: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'integer', default: 0, name: 'member_count' })
  memberCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_synced_at' })
  lastSyncedAt: Date;
}
