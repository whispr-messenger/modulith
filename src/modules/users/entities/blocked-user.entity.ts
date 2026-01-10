import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from './user.entity';

@Entity({ name: 'blocked_users', schema: 'users' })
@Index(['userId', 'blockedUserId'], { unique: true })
export class BlockedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  blockedUserId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @CreateDateColumn()
  blockedAt: Date;

  @ManyToOne(() => require('./user.entity').User, (user: User) => user.blockedUsers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => require('./user.entity').User, (user: User) => user.blockedBy)
  @JoinColumn({ name: 'blockedUserId' })
  blockedUser: User;
}
