import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_projections', { schema: 'messaging' })
@Index(['isActive'])
@Index(['lastSyncedAt'])
export class UserProjection {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 50, name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 50, name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'text', name: 'profile_picture_url', nullable: true })
  profilePictureUrl: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_synced_at' })
  lastSyncedAt: Date;

  // Helper method
  getDisplayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.username;
  }
}
