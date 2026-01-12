import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from '../../common/entities/user.entity';

@Entity({ name: 'user_search_index', schema: 'users' })
export class UserSearchIndex {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  phoneNumberHash: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  usernameNormalized: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  firstNameNormalized: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  lastNameNormalized: string;

  @OneToOne(() => require('../../common/entities/user.entity').User, (user: User) => user.searchIndex)
  @JoinColumn({ name: 'userId' })
  user: User;
}
