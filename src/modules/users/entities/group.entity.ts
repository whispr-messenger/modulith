import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { User } from './user.entity';
import type { GroupMember } from './group-member.entity';

@Entity({ name: 'groups', schema: 'users' })
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pictureUrl: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => require('./user.entity').User, (user: User) => user.createdGroups)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => require('./group-member.entity').GroupMember, (groupMember: GroupMember) => groupMember.group)
  members: GroupMember[];
}
