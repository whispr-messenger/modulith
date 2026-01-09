import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './messages.service';
import { MessageType } from '../entities';

describe('MessagesController', () => {
    let controller: MessagesController;
    let service: MessagesService;

    const mockMessagesService = {
        createMessage: jest.fn(),
        getConversationMessages: jest.fn(),
        findById: jest.fn(),
        editMessage: jest.fn(),
        deleteMessage: jest.fn(),
        markAsDelivered: jest.fn(),
        markAsRead: jest.fn(),
        markMultipleAsRead: jest.fn(),
        getDeliveryStatus: jest.fn(),
        addReaction: jest.fn(),
        removeReaction: jest.fn(),
        getReactions: jest.fn(),
    };

    const mockUser = { id: 'test-user-id' };
    const mockRequest = { user: mockUser };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MessagesController],
            providers: [
                {
                    provide: MessagesService,
                    useValue: mockMessagesService,
                },
            ],
        }).compile();

        controller = module.get<MessagesController>(MessagesController);
        service = module.get<MessagesService>(MessagesService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a message', async () => {
            const dto: CreateMessageDto = {
                conversationId: 'conv-id',
                content: 'Hello',
                type: MessageType.TEXT,
            };
            const expectedResult = { id: 'msg-id', ...dto };

            mockMessagesService.createMessage.mockResolvedValue(expectedResult);

            const result = await controller.create(dto, mockRequest);

            expect(service.createMessage).toHaveBeenCalledWith(dto, mockUser.id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('getConversationMessages', () => {
        it('should get conversation messages', async () => {
            const convId = 'conv-id';
            const expectedResult = [{ id: 'msg-1' }];

            mockMessagesService.getConversationMessages.mockResolvedValue(expectedResult);

            const result = await controller.getConversationMessages(convId, mockRequest);

            expect(service.getConversationMessages).toHaveBeenCalledWith(convId, mockUser.id, {
                limit: 50,
                before: undefined,
                after: undefined,
            });
            expect(result).toEqual(expectedResult);
        });

        it('should pass query params', async () => {
            const convId = 'conv-id';
            const beforeDate = new Date().toISOString();

            mockMessagesService.getConversationMessages.mockResolvedValue([]);

            await controller.getConversationMessages(convId, mockRequest, 20, beforeDate);

            expect(service.getConversationMessages).toHaveBeenCalledWith(convId, mockUser.id, {
                limit: 20,
                before: new Date(beforeDate),
                after: undefined,
            });
        });
    });

    describe('findOne', () => {
        it('should return a message by id', async () => {
            const id = 'msg-id';
            const expectedResult = { id, content: 'Hello' };
            mockMessagesService.findById.mockResolvedValue(expectedResult);

            const result = await controller.findOne(id);

            expect(service.findById).toHaveBeenCalledWith(id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('edit', () => {
        it('should edit a message', async () => {
            const id = 'msg-id';
            const body = { content: 'Updated content' };
            const expectedResult = { id, ...body };

            mockMessagesService.editMessage.mockResolvedValue(expectedResult);

            const result = await controller.edit(id, body, mockRequest);

            expect(service.editMessage).toHaveBeenCalledWith(id, body.content, mockUser.id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('delete', () => {
        it('should delete a message', async () => {
            const id = 'msg-id';
            const body = { forEveryone: true };

            mockMessagesService.deleteMessage.mockResolvedValue(undefined);

            const result = await controller.delete(id, body, mockRequest);

            expect(service.deleteMessage).toHaveBeenCalledWith(id, mockUser.id, body.forEveryone);
            expect(result).toEqual({ success: true });
        });
    });

    describe('markDelivered', () => {
        it('should mark message as delivered', async () => {
            const id = 'msg-id';
            mockMessagesService.markAsDelivered.mockResolvedValue(undefined);

            const result = await controller.markDelivered(id, mockRequest);

            expect(service.markAsDelivered).toHaveBeenCalledWith(id, mockUser.id);
            expect(result).toEqual({ success: true });
        });
    });

    describe('markRead', () => {
        it('should mark message as read', async () => {
            const id = 'msg-id';
            mockMessagesService.markAsRead.mockResolvedValue(undefined);

            const result = await controller.markRead(id, mockRequest);

            expect(service.markAsRead).toHaveBeenCalledWith(id, mockUser.id);
            expect(result).toEqual({ success: true });
        });
    });

    describe('markMultipleRead', () => {
        it('should mark multiple messages as read', async () => {
            const body = { messageIds: ['msg-1', 'msg-2'] };
            mockMessagesService.markMultipleAsRead.mockResolvedValue(undefined);

            const result = await controller.markMultipleRead(body, mockRequest);

            expect(service.markMultipleAsRead).toHaveBeenCalledWith(body.messageIds, mockUser.id);
            expect(result).toEqual({ success: true });
        });
    });

    describe('getDeliveryStatus', () => {
        it('should return delivery status', async () => {
            const id = 'msg-id';
            const expectedResult = [{ userId: 'user-1', status: 'read' }];
            mockMessagesService.getDeliveryStatus.mockResolvedValue(expectedResult);

            const result = await controller.getDeliveryStatus(id);

            expect(service.getDeliveryStatus).toHaveBeenCalledWith(id);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('reactions', () => {
        it('should add a reaction', async () => {
            const id = 'msg-id';
            const body = { reaction: '👍' };
            const expectedResult = { id: 'reaction-id', ...body };

            mockMessagesService.addReaction.mockResolvedValue(expectedResult);

            const result = await controller.addReaction(id, body, mockRequest);

            expect(service.addReaction).toHaveBeenCalledWith(id, mockUser.id, body.reaction);
            expect(result).toEqual(expectedResult);
        });

        it('should remove a reaction', async () => {
            const id = 'msg-id';
            const reaction = '👍';

            mockMessagesService.removeReaction.mockResolvedValue(undefined);

            const result = await controller.removeReaction(id, reaction, mockRequest);

            expect(service.removeReaction).toHaveBeenCalledWith(id, mockUser.id, reaction);
            expect(result).toEqual({ success: true });
        });

        it('should get reactions', async () => {
            const id = 'msg-id';
            const expectedResult = ['👍', '❤️'];
            mockMessagesService.getReactions.mockResolvedValue(expectedResult);

            const result = await controller.getReactions(id);

            expect(service.getReactions).toHaveBeenCalledWith(id);
            expect(result).toEqual(expectedResult);
        });
    });
});
