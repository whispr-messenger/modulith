import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MessagingEventsService, MessagingEventType } from './messaging-events.service';
import { Message, Conversation } from '../entities';
import { ConversationType } from '../entities/conversation.entity';
import { MessageType } from '../entities/message.entity';

describe('MessagingEventsService', () => {
    let service: MessagingEventsService;
    let mockCacheManager: any;
    let mockPublish: jest.Mock;

    beforeEach(async () => {
        mockPublish = jest.fn().mockResolvedValue(undefined);
        mockCacheManager = {
            store: {
                client: {
                    publish: mockPublish,
                },
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingEventsService,
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
            ],
        }).compile();

        service = module.get<MessagingEventsService>(MessagingEventsService);
    });

    const createMockConversation = (): Partial<Conversation> => ({
        id: 'conv-id',
        type: ConversationType.DIRECT,
        metadata: { name: 'Test' },
    });

    const createMockMessage = (): Partial<Message> => ({
        id: 'msg-id',
        conversationId: 'conv-id',
        senderId: 'user-1',
        content: 'Hello',
        messageType: MessageType.TEXT,
        metadata: {},
        replyToId: null,
        sentAt: new Date(),
    });

    describe('publishConversationCreated', () => {
        it('should publish conversation created event', async () => {
            const conversation = createMockConversation() as Conversation;
            await service.publishConversationCreated(conversation, ['user-1', 'user-2']);

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.CONVERSATION_CREATED),
            );
        });
    });

    describe('publishConversationUpdated', () => {
        it('should publish conversation updated event', async () => {
            await service.publishConversationUpdated('conv-id', { name: 'Updated' });

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.CONVERSATION_UPDATED),
            );
        });
    });

    describe('publishMemberAdded', () => {
        it('should publish member added event', async () => {
            await service.publishMemberAdded('conv-id', 'user-2', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MEMBER_ADDED),
            );
        });
    });

    describe('publishMemberRemoved', () => {
        it('should publish member removed event', async () => {
            await service.publishMemberRemoved('conv-id', 'user-2', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MEMBER_REMOVED),
            );
        });
    });

    describe('publishMessageCreated', () => {
        it('should publish message created event', async () => {
            const message = createMockMessage() as Message;
            await service.publishMessageCreated(message, ['user-2']);

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MESSAGE_CREATED),
            );
        });
    });

    describe('publishMessageEdited', () => {
        it('should publish message edited event', async () => {
            const message = {
                ...createMockMessage(),
                editedAt: new Date(),
            } as Message;
            await service.publishMessageEdited(message);

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MESSAGE_EDITED),
            );
        });
    });

    describe('publishMessageDeleted', () => {
        it('should publish message deleted event for everyone', async () => {
            await service.publishMessageDeleted('msg-id', 'conv-id', true);

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MESSAGE_DELETED),
            );
        });

        it('should publish message deleted event for self', async () => {
            await service.publishMessageDeleted('msg-id', 'conv-id', false);

            expect(mockPublish).toHaveBeenCalled();
        });
    });

    describe('publishMessageDelivered', () => {
        it('should publish message delivered event', async () => {
            await service.publishMessageDelivered('msg-id', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MESSAGE_DELIVERED),
            );
        });
    });

    describe('publishMessageRead', () => {
        it('should publish message read event', async () => {
            await service.publishMessageRead('msg-id', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.MESSAGE_READ),
            );
        });
    });

    describe('publishReactionAdded', () => {
        it('should publish reaction added event', async () => {
            await service.publishReactionAdded('msg-id', 'conv-id', 'user-1', '👍');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.REACTION_ADDED),
            );
        });
    });

    describe('publishReactionRemoved', () => {
        it('should publish reaction removed event', async () => {
            await service.publishReactionRemoved('msg-id', 'conv-id', 'user-1', '👍');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.REACTION_REMOVED),
            );
        });
    });

    describe('publishTypingStarted', () => {
        it('should publish typing started event', async () => {
            await service.publishTypingStarted('conv-id', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.TYPING_STARTED),
            );
        });
    });

    describe('publishTypingStopped', () => {
        it('should publish typing stopped event', async () => {
            await service.publishTypingStopped('conv-id', 'user-1');

            expect(mockPublish).toHaveBeenCalledWith(
                'messaging:events',
                expect.stringContaining(MessagingEventType.TYPING_STOPPED),
            );
        });
    });

    describe('error handling', () => {
        it('should handle missing Redis client gracefully', async () => {
            mockCacheManager.store = { client: null };

            await expect(
                service.publishConversationCreated(createMockConversation() as Conversation, ['user-1']),
            ).resolves.not.toThrow();
        });

        it('should handle publish error gracefully', async () => {
            mockPublish.mockRejectedValueOnce(new Error('Redis error'));

            await expect(
                service.publishConversationUpdated('conv-id', {}),
            ).resolves.not.toThrow();
        });
    });
});
