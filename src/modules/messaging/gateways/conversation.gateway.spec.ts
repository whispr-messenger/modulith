import { Test, TestingModule } from '@nestjs/testing';
import { ConversationGateway } from './conversation.gateway';
import { PresenceService } from '../presence/presence.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { MessageType } from '../entities/message.entity';

describe('ConversationGateway', () => {
    let gateway: ConversationGateway;
    let presenceService: PresenceService;
    let conversationsService: ConversationsService;
    let messagesService: MessagesService;

    const mockPresenceService = {
        trackUserConnection: jest.fn(),
        removeUserConnection: jest.fn(),
        isUserOnline: jest.fn(),
        joinConversation: jest.fn(),
        leaveConversation: jest.fn(),
        getConversationUsers: jest.fn(),
        setTypingStatus: jest.fn(),
    };

    const mockConversationsService = {
        isUserMember: jest.fn(),
    };

    const mockMessagesService = {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        addReaction: jest.fn(),
        removeReaction: jest.fn(),
        findOne: jest.fn(),
        markAsRead: jest.fn(),
    };

    const mockServer = {
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
    };

    const mockClient = {
        id: 'client-id',
        handshake: { auth: { userId: 'user-id' } },
        data: { userId: 'user-id' },
        join: jest.fn(),
        leave: jest.fn(),
        disconnect: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConversationGateway,
                { provide: PresenceService, useValue: mockPresenceService },
                { provide: ConversationsService, useValue: mockConversationsService },
                { provide: MessagesService, useValue: mockMessagesService },
            ],
        }).compile();

        gateway = module.get<ConversationGateway>(ConversationGateway);
        gateway.server = mockServer as any;
        presenceService = module.get<PresenceService>(PresenceService);
        conversationsService = module.get<ConversationsService>(ConversationsService);
        messagesService = module.get<MessagesService>(MessagesService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleConnection', () => {
        it('should track user connection', async () => {
            await gateway.handleConnection(mockClient as any);

            expect(mockPresenceService.trackUserConnection).toHaveBeenCalledWith(mockClient, 'user-id');
            expect(mockClient.join).toHaveBeenCalledWith('user:user-id');
            expect(mockServer.emit).toHaveBeenCalledWith('user:online', expect.any(Object));
        });

        it('should disconnect if no userId', async () => {
            const badClient = { ...mockClient, handshake: { auth: {} } };
            await gateway.handleConnection(badClient as any);

            expect(badClient.disconnect).toHaveBeenCalled();
            expect(mockPresenceService.trackUserConnection).not.toHaveBeenCalled();
        });
    });

    describe('handleDisconnect', () => {
        it('should remove user connection', () => {
            mockPresenceService.removeUserConnection.mockReturnValue('user-id');
            mockPresenceService.isUserOnline.mockReturnValue(false);

            gateway.handleDisconnect(mockClient as any);

            expect(mockPresenceService.removeUserConnection).toHaveBeenCalledWith(mockClient.id);
            expect(mockServer.emit).toHaveBeenCalledWith('user:offline', expect.any(Object));
        });
    });

    describe('handleJoinConversation', () => {
        it('should join conversation if member', async () => {
            const payload = { conversationId: 'conv-id' };
            mockConversationsService.isUserMember.mockResolvedValue(true);
            mockPresenceService.getConversationUsers.mockReturnValue(['user-id']);

            const result = await gateway.handleJoinConversation(mockClient as any, payload);

            expect(mockClient.join).toHaveBeenCalledWith('conversation:conv-id');
            expect(mockPresenceService.joinConversation).toHaveBeenCalledWith('user-id', 'conv-id');
            expect(mockClient.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(mockClient.to('conversation:conv-id').emit).toHaveBeenCalledWith('user:joined', expect.any(Object));
            expect(result).toEqual({ success: true, usersOnline: ['user-id'] });
        });

        it('should error if not member', async () => {
            const payload = { conversationId: 'conv-id' };
            mockConversationsService.isUserMember.mockResolvedValue(false);

            const result = await gateway.handleJoinConversation(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(mockClient.join).not.toHaveBeenCalled();
        });
    });

    describe('handleLeaveConversation', () => {
        it('should leave conversation', () => {
            const payload = { conversationId: 'conv-id' };

            const result = gateway.handleLeaveConversation(mockClient as any, payload);

            expect(mockClient.leave).toHaveBeenCalledWith('conversation:conv-id');
            expect(mockPresenceService.leaveConversation).toHaveBeenCalledWith('user-id', 'conv-id');
            expect(mockClient.to('conversation:conv-id').emit).toHaveBeenCalledWith('user:left', expect.any(Object));
            expect(result).toEqual({ success: true });
        });
    });

    describe('handleNewMessage', () => {
        it('should create and broadcast message', async () => {
            const payload = {
                conversationId: 'conv-id',
                content: 'Hello',
                messageType: MessageType.TEXT
            };
            const createdMessage = { id: 'msg-id', ...payload };

            mockMessagesService.create.mockResolvedValue(createdMessage);

            const result = await gateway.handleNewMessage(mockClient as any, payload);

            expect(mockMessagesService.create).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(mockServer.to('conversation:conv-id').emit).toHaveBeenCalledWith('message:new', {
                message: createdMessage,
                timestamp: expect.any(Date),
            });
            expect(result).toEqual({ success: true, message: createdMessage });
        });
    });

    describe('handleTyping', () => {
        it('should handle typing start', () => {
            const payload = { conversationId: 'conv-id', isTyping: true };

            gateway.handleTypingStart(mockClient as any, payload);

            expect(mockPresenceService.setTypingStatus).toHaveBeenCalledWith('user-id', 'conv-id', true);
            expect(mockClient.to('conversation:conv-id').emit).toHaveBeenCalledWith('typing:update', expect.objectContaining({ isTyping: true }));
        });

        it('should handle typing stop', () => {
            const payload = { conversationId: 'conv-id', isTyping: false };

            gateway.handleTypingStop(mockClient as any, payload);

            expect(mockPresenceService.setTypingStatus).toHaveBeenCalledWith('user-id', 'conv-id', false);
            expect(mockClient.to('conversation:conv-id').emit).toHaveBeenCalledWith('typing:update', expect.objectContaining({ isTyping: false }));
        });
    });

    describe('afterInit', () => {
        it('should log gateway initialization', () => {
            const mockServerInit = {} as any;
            expect(() => gateway.afterInit(mockServerInit)).not.toThrow();
        });
    });

    describe('handleEditMessage', () => {
        it('should edit and broadcast message update', async () => {
            const payload = { messageId: 'msg-id', content: 'Updated content' };
            const updatedMessage = { id: 'msg-id', content: 'Updated content', conversationId: 'conv-id' };

            mockMessagesService.update.mockResolvedValue(updatedMessage);

            const result = await gateway.handleEditMessage(mockClient as any, payload);

            expect(mockMessagesService.update).toHaveBeenCalledWith('msg-id', { content: 'Updated content' }, 'user-id');
            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(result).toEqual({ success: true, message: updatedMessage });
        });

        it('should return error on failure', async () => {
            const payload = { messageId: 'msg-id', content: 'Updated' };
            mockMessagesService.update.mockRejectedValue(new Error('Edit failed'));

            const result = await gateway.handleEditMessage(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Edit failed');
        });
    });

    describe('handleDeleteMessage', () => {
        it('should delete and broadcast message deletion for everyone', async () => {
            const payload = { messageId: 'msg-id', deleteForEveryone: true };
            const message = { id: 'msg-id', conversationId: 'conv-id' };

            mockMessagesService.delete.mockResolvedValue(message);

            const result = await gateway.handleDeleteMessage(mockClient as any, payload);

            expect(mockMessagesService.delete).toHaveBeenCalledWith('msg-id', 'user-id', true);
            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(result).toEqual({ success: true });
        });

        it('should delete for self only without broadcast', async () => {
            const payload = { messageId: 'msg-id', deleteForEveryone: false };
            const message = { id: 'msg-id', conversationId: 'conv-id' };

            mockMessagesService.delete.mockResolvedValue(message);

            const result = await gateway.handleDeleteMessage(mockClient as any, payload);

            expect(result.success).toBe(true);
        });

        it('should return error on failure', async () => {
            const payload = { messageId: 'msg-id', deleteForEveryone: true };
            mockMessagesService.delete.mockRejectedValue(new Error('Delete failed'));

            const result = await gateway.handleDeleteMessage(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Delete failed');
        });
    });

    describe('handleAddReaction', () => {
        it('should add reaction and broadcast', async () => {
            const payload = { messageId: 'msg-id', reaction: '👍' };
            const message = { id: 'msg-id', conversationId: 'conv-id' };
            const reactionResult = { id: 'reaction-id' };

            mockMessagesService.addReaction.mockResolvedValue(reactionResult);
            mockMessagesService.findOne.mockResolvedValue(message);

            const result = await gateway.handleAddReaction(mockClient as any, payload);

            expect(mockMessagesService.addReaction).toHaveBeenCalledWith('msg-id', 'user-id', '👍');
            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(result).toEqual({ success: true, reaction: reactionResult });
        });

        it('should return error on failure', async () => {
            const payload = { messageId: 'msg-id', reaction: '👍' };
            mockMessagesService.addReaction.mockRejectedValue(new Error('Reaction failed'));

            const result = await gateway.handleAddReaction(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Reaction failed');
        });
    });

    describe('handleRemoveReaction', () => {
        it('should remove reaction and broadcast', async () => {
            const payload = { messageId: 'msg-id', reaction: '👍' };
            const message = { id: 'msg-id', conversationId: 'conv-id' };

            mockMessagesService.removeReaction.mockResolvedValue(undefined);
            mockMessagesService.findOne.mockResolvedValue(message);

            const result = await gateway.handleRemoveReaction(mockClient as any, payload);

            expect(mockMessagesService.removeReaction).toHaveBeenCalledWith('msg-id', 'user-id', '👍');
            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(result).toEqual({ success: true });
        });

        it('should return error on failure', async () => {
            const payload = { messageId: 'msg-id', reaction: '👍' };
            mockMessagesService.removeReaction.mockRejectedValue(new Error('Remove failed'));

            const result = await gateway.handleRemoveReaction(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Remove failed');
        });
    });

    describe('handleMessageRead', () => {
        it('should mark message as read and notify sender', async () => {
            const payload = { messageId: 'msg-id' };
            const message = { id: 'msg-id', senderId: 'sender-id', conversationId: 'conv-id' };

            mockMessagesService.markAsRead.mockResolvedValue(undefined);
            mockMessagesService.findOne.mockResolvedValue(message);

            const result = await gateway.handleMessageRead(mockClient as any, payload);

            expect(mockMessagesService.markAsRead).toHaveBeenCalledWith('msg-id', 'user-id');
            expect(mockServer.to).toHaveBeenCalledWith('user:sender-id');
            expect(result).toEqual({ success: true });
        });

        it('should return error on failure', async () => {
            const payload = { messageId: 'msg-id' };
            mockMessagesService.markAsRead.mockRejectedValue(new Error('Read failed'));

            const result = await gateway.handleMessageRead(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Read failed');
        });
    });

    describe('handleNewMessage error handling', () => {
        it('should return error on message creation failure', async () => {
            const payload = {
                conversationId: 'conv-id',
                content: 'Hello',
                messageType: MessageType.TEXT
            };
            mockMessagesService.create.mockRejectedValue(new Error('Create failed'));

            const result = await gateway.handleNewMessage(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Create failed');
        });
    });

    describe('handleJoinConversation error handling', () => {
        it('should return error on exception', async () => {
            const payload = { conversationId: 'conv-id' };
            mockConversationsService.isUserMember.mockRejectedValue(new Error('Check failed'));

            const result = await gateway.handleJoinConversation(mockClient as any, payload);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Check failed');
        });
    });

    describe('handleConnection error handling', () => {
        it('should disconnect on error', async () => {
            const badClient = {
                ...mockClient,
                handshake: { auth: { userId: 'user-id' } },
                disconnect: jest.fn(),
            };
            mockPresenceService.trackUserConnection.mockImplementation(() => {
                throw new Error('Track failed');
            });

            await gateway.handleConnection(badClient as any);

            expect(badClient.disconnect).toHaveBeenCalled();
        });
    });

    describe('handleDisconnect edge cases', () => {
        it('should not emit offline if user still has connections', () => {
            mockPresenceService.removeUserConnection.mockReturnValue('user-id');
            mockPresenceService.isUserOnline.mockReturnValue(true);

            gateway.handleDisconnect(mockClient as any);

            expect(mockServer.emit).not.toHaveBeenCalledWith('user:offline', expect.any(Object));
        });

        it('should handle null userId', () => {
            mockPresenceService.removeUserConnection.mockReturnValue(null);

            expect(() => gateway.handleDisconnect(mockClient as any)).not.toThrow();
        });
    });

    describe('utility methods', () => {
        it('broadcastToConversation should emit to conversation room', () => {
            gateway.broadcastToConversation('conv-id', 'test:event', { data: 'test' });

            expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-id');
            expect(mockServer.to('conversation:conv-id').emit).toHaveBeenCalledWith('test:event', { data: 'test' });
        });

        it('sendToUser should emit to user room', () => {
            gateway.sendToUser('user-id', 'test:event', { data: 'test' });

            expect(mockServer.to).toHaveBeenCalledWith('user:user-id');
            expect(mockServer.to('user:user-id').emit).toHaveBeenCalledWith('test:event', { data: 'test' });
        });
    });
});

