import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from '../common/entities/user.entity';
import type { Group } from './group.entity';

export enum GroupRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

@Entity({ name: 'group_members', schema: 'users' })
@Index(['groupId', 'userId'], { unique: true })
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: GroupRole,
    default: GroupRole.MEMBER,
  })
  role: GroupRole;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => require('./group.entity').Group, (group: Group) => group.members)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => require('../common/entities/user.entity').User, (user: User) => user.groupMemberships)
  @JoinColumn({ name: 'userId' })
  user: User;
}
