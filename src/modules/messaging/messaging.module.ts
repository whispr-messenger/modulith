import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
    Conversation,
    ConversationMember,
    Message,
    DeliveryStatus,
    MessageReaction,
} from './entities';

// Services
import { ConversationsService } from './conversations/conversations.service';
import { MessagesService } from './messages/messages.service';
import { MessagingEventsService } from './events/messaging-events.service';
import { PresenceService } from './presence/presence.service';

// Controllers
import { ConversationsController } from './conversations/conversations.controller';
import { MessagesController } from './messages/messages.controller';

// Gateways (WebSocket)
import { ConversationGateway } from './gateways/conversation.gateway';

// Projection Modules
import { UserProjectionModule } from './projections/users/user-projection.module';
import { GroupProjectionModule } from './projections/groups/group-projection.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Conversation,
            ConversationMember,
            Message,
            DeliveryStatus,
            MessageReaction,
        ]),
        // Import projection modules for event handling
        UserProjectionModule,
        GroupProjectionModule,
    ],
    controllers: [
        ConversationsController,
        MessagesController,
    ],
    providers: [
        // Services
        ConversationsService,
        MessagesService,
        MessagingEventsService,
        PresenceService,
        // WebSocket Gateways
        ConversationGateway,
    ],
    exports: [
        ConversationsService,
        MessagesService,
        MessagingEventsService,
        PresenceService,
        ConversationGateway,
    ],
})
export class MessagingModule { }
