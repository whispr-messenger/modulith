import { Module } from '@nestjs/common';
import { UserSearchModule } from './search/user-search.module';
import { ProfileModule } from './profile/profile.module';
import { AccountsModule } from './accounts/accounts.module';
import { BlockedUsersModule } from './blocked-users/blocked-users.module';
import { ContactsModule } from './contacts/contacts.module';
import { GroupsModule } from './groups';
import { PrivacyModule } from './privacy/privacy.module';

@Module({
  imports: [
    AccountsModule,
    BlockedUsersModule,
    ContactsModule,
    GroupsModule,
    PrivacyModule,
    ProfileModule,
    UserSearchModule,
  ],
})
export class UsersModule { }
