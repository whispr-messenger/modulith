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

@Entity({ name: 'contacts', schema: 'users' })
@Index(['userId', 'contactId'], { unique: true })
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  contactId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string;

  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  @CreateDateColumn()
  addedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => require('../common/entities/user.entity').User, (user: User) => user.contacts)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => require('../common/entities/user.entity').User, (user: User) => user.contactedBy)
  @JoinColumn({ name: 'contactId' })
  contactUser: User;
}
