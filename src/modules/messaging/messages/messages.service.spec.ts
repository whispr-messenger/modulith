import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagesService, CreateMessageDto } from './messages.service';
import { Message, DeliveryStatus, MessageReaction, MessageType } from '../entities';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagingEventsService } from '../events/messaging-events.service';
import { Repository } from 'typeorm';

describe('MessagesService', () => {
    let service: MessagesService;
    let messageRepository: Repository<Message>;
    let deliveryStatusRepository: Repository<DeliveryStatus>;
    let reactionRepository: Repository<MessageReaction>;
    let conversationsService: ConversationsService;
    let eventsService: MessagingEventsService;

    const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
    };

    const mockMessageRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockDeliveryStatusRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
    };

    const mockReactionRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
    };

    const mockConversationsService = {
        isMember: jest.fn(),
        getMembers: jest.fn(),
    };

    const mockEventsService = {
        publishMessageCreated: jest.fn(),
        publishMessageEdited: jest.fn(),
        publishMessageDeleted: jest.fn(),
        publishMessageDelivered: jest.fn(),
        publishMessageRead: jest.fn(),
        publishReactionAdded: jest.fn(),
        publishReactionRemoved: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: getRepositoryToken(Message),
                    useValue: mockMessageRepository,
                },
                {
                    provide: getRepositoryToken(DeliveryStatus),
                    useValue: mockDeliveryStatusRepository,
                },
                {
                    provide: getRepositoryToken(MessageReaction),
                    useValue: mockReactionRepository,
                },
                {
                    provide: ConversationsService,
                    useValue: mockConversationsService,
                },
                {
                    provide: MessagingEventsService,
                    useValue: mockEventsService,
                },
            ],
        }).compile();

        service = module.get<MessagesService>(MessagesService);
        messageRepository = module.get<Repository<Message>>(getRepositoryToken(Message));
        deliveryStatusRepository = module.get<Repository<DeliveryStatus>>(getRepositoryToken(DeliveryStatus));
        reactionRepository = module.get<Repository<MessageReaction>>(getRepositoryToken(MessageReaction));
        conversationsService = module.get<ConversationsService>(ConversationsService);
        eventsService = module.get<MessagingEventsService>(MessagingEventsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createMessage', () => {
        it('should create a message', async () => {
            const dto: CreateMessageDto = {
                conversationId: 'conv-id',
                content: 'Hello',
                messageType: MessageType.TEXT,
            };
            const senderId = 'user-1';
            const savedMessage = { id: 'msg-id', conversationId: 'conv-id', ...dto };

            mockConversationsService.isMember.mockResolvedValue(true);
            mockMessageRepository.create.mockReturnValue(savedMessage);
            mockMessageRepository.save.mockResolvedValue(savedMessage);
            mockConversationsService.getMembers.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);

            // Mock findById to return full message
            mockMessageRepository.findOne.mockResolvedValue(savedMessage);
            mockDeliveryStatusRepository.create.mockReturnValue({});
            mockDeliveryStatusRepository.save.mockResolvedValue([]);

            const result = await service.createMessage(dto, senderId);

            expect(mockMessageRepository.save).toHaveBeenCalled();
            expect(mockDeliveryStatusRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMessageCreated).toHaveBeenCalled();
            expect(result).toEqual(savedMessage);
        });

        it('should throw ForbiddenException if sender not member', async () => {
            const dto: CreateMessageDto = {
                conversationId: 'conv-id',
                content: 'Hello',
            };
            mockConversationsService.isMember.mockResolvedValue(false);

            await expect(service.createMessage(dto, 'user-1')).rejects.toThrow();
        });
    });

    describe('getConversationMessages', () => {
        it('should return messages', async () => {
            mockConversationsService.isMember.mockResolvedValue(true);
            const messages = [{ id: 'msg-1' }];
            mockQueryBuilder.getMany.mockResolvedValue(messages);

            const result = await service.getConversationMessages('conv-id', 'user-1');
            expect(result).toEqual(messages);
        });

        it('should handle pagination options', async () => {
            mockConversationsService.isMember.mockResolvedValue(true);
            mockQueryBuilder.getMany.mockResolvedValue([]);
            const before = new Date();

            await service.getConversationMessages('conv-id', 'user-1', { limit: 10, before });
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('m.sentAt < :before'), { before });
        });
    });

    describe('editMessage', () => {
        it('should edit message', async () => {
            const message = {
                id: 'msg-id',
                senderId: 'user-1',
                isEditable: () => true,
                markAsEdited: jest.fn(),
            };
            mockMessageRepository.findOne.mockResolvedValue(message);
            mockMessageRepository.save.mockResolvedValue(message);

            await service.editMessage('msg-id', 'New content', 'user-1');

            expect(message.markAsEdited).toHaveBeenCalledWith('New content');
            expect(mockMessageRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMessageEdited).toHaveBeenCalled();
        });

        it('should throw if not sender', async () => {
            const message = { id: 'msg-id', senderId: 'other-user' };
            mockMessageRepository.findOne.mockResolvedValue(message);

            await expect(service.editMessage('msg-id', 'cnt', 'user-1')).rejects.toThrow();
        });
    });

    describe('deleteMessage', () => {
        it('should delete message', async () => {
            const message = {
                id: 'msg-id',
                senderId: 'user-1',
                conversationId: 'conv-id',
                isDeletable: () => true,
                markAsDeleted: jest.fn(),
            };
            mockMessageRepository.findOne.mockResolvedValue(message);

            await service.deleteMessage('msg-id', 'user-1', true);

            expect(message.markAsDeleted).toHaveBeenCalledWith(true);
            expect(mockMessageRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMessageDeleted).toHaveBeenCalledWith('msg-id', 'conv-id', true);
        });
    });

    describe('markAsDelivered', () => {
        it('should mark as delivered', async () => {
            const status = {
                markAsDelivered: jest.fn(),
            };
            mockDeliveryStatusRepository.findOne.mockResolvedValue(status);

            await service.markAsDelivered('msg-id', 'user-1');

            expect(status.markAsDelivered).toHaveBeenCalled();
            expect(mockDeliveryStatusRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishMessageDelivered).toHaveBeenCalled();
        });
    });

    describe('markMultipleAsRead', () => {
        it('should mark multiple messages as read', async () => {
            const messageIds = ['msg-1', 'msg-2'];
            await service.markMultipleAsRead(messageIds, 'user-1');

            expect(mockDeliveryStatusRepository.update).toHaveBeenCalled();
            expect(mockEventsService.publishMessageRead).toHaveBeenCalledTimes(2);
        });
    });

    describe('addReaction', () => {
        it('should add reaction', async () => {
            const message = { id: 'msg-id', conversationId: 'conv-id' };
            mockMessageRepository.findOne.mockResolvedValue(message);
            mockReactionRepository.findOne.mockResolvedValue(null);

            const reaction = { id: 'r-id' };
            mockReactionRepository.create.mockReturnValue(reaction);
            mockReactionRepository.save.mockResolvedValue(reaction);

            const result = await service.addReaction('msg-id', 'user-1', '👍');

            expect(mockReactionRepository.save).toHaveBeenCalled();
            expect(mockEventsService.publishReactionAdded).toHaveBeenCalled();
            expect(result).toEqual(reaction);
        });
    });
});
