import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import type { PrivacySettings } from './privacy-settings.entity';
import type { Contact } from './contact.entity';
import type { BlockedUser } from './blocked-user.entity';
import type { Group } from './group.entity';
import type { GroupMember } from './group-member.entity';
import type { UserSearchIndex } from './user-search-index.entity';

@Entity({ name: 'users', schema: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'text', nullable: true })
  biography: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(
    () => require('./privacy-settings.entity').PrivacySettings,
    (privacySettings: PrivacySettings) => privacySettings.user,
    {
      cascade: true,
    },
  )
  privacySettings: PrivacySettings;

  @OneToMany(() => require('./contact.entity').Contact, (contact: Contact) => contact.user)
  contacts: Contact[];

  @OneToMany(() => require('./contact.entity').Contact, (contact: Contact) => contact.contactUser)
  contactedBy: Contact[];

  @OneToMany(() => require('./blocked-user.entity').BlockedUser, (blockedUser: BlockedUser) => blockedUser.user)
  blockedUsers: BlockedUser[];

  @OneToMany(() => require('./blocked-user.entity').BlockedUser, (blockedUser: BlockedUser) => blockedUser.blockedUser)
  blockedBy: BlockedUser[];

  @OneToMany(() => require('./group.entity').Group, (group: Group) => group.createdBy)
  createdGroups: Group[];

  @OneToMany(() => require('./group-member.entity').GroupMember, (groupMember: GroupMember) => groupMember.user)
  groupMemberships: GroupMember[];

  @OneToOne(() => require('./user-search-index.entity').UserSearchIndex, (searchIndex: UserSearchIndex) => searchIndex.user, {
    cascade: true,
  })
  searchIndex: UserSearchIndex;
}
