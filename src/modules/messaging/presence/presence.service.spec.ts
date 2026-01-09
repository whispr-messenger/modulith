import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { Socket } from 'socket.io';

describe('PresenceService', () => {
    let service: PresenceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PresenceService],
        }).compile();

        service = module.get<PresenceService>(PresenceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('trackUserConnection', () => {
        it('should track user connection', () => {
            const socket = { id: 'socket-1' } as Socket;
            service.trackUserConnection(socket, 'user-1');

            expect(service.isUserOnline('user-1')).toBe(true);
            expect(service.getUserSockets('user-1')).toContain('socket-1');
            expect(service.getUserFromSocket('socket-1')).toBe('user-1');
        });

        it('should handle multiple connections for same user', () => {
            const socket1 = { id: 'socket-1' } as Socket;
            const socket2 = { id: 'socket-2' } as Socket;

            service.trackUserConnection(socket1, 'user-1');
            service.trackUserConnection(socket2, 'user-1');

            expect(service.getUserSockets('user-1')).toHaveLength(2);
            expect(service.getUserSockets('user-1')).toEqual(expect.arrayContaining(['socket-1', 'socket-2']));
        });
    });

    describe('removeUserConnection', () => {
        it('should remove user connection', () => {
            const socket = { id: 'socket-1' } as Socket;
            service.trackUserConnection(socket, 'user-1');

            const result = service.removeUserConnection('socket-1');

            expect(result).toBe('user-1');
            expect(service.isUserOnline('user-1')).toBe(false);
            expect(service.getUserSockets('user-1')).toHaveLength(0);
        });

        it('should keep user online if other sockets exist', () => {
            const socket1 = { id: 'socket-1' } as Socket;
            const socket2 = { id: 'socket-2' } as Socket;

            service.trackUserConnection(socket1, 'user-1');
            service.trackUserConnection(socket2, 'user-1');

            service.removeUserConnection('socket-1');

            expect(service.isUserOnline('user-1')).toBe(true);
            expect(service.getUserSockets('user-1')).toContain('socket-2');
        });

        it('should return undefined if socket not found', () => {
            expect(service.removeUserConnection('unknown')).toBeUndefined();
        });
    });

    describe('conversation presence', () => {
        it('should join conversation', () => {
            service.joinConversation('user-1', 'conv-1');
            expect(service.getConversationUsers('conv-1')).toContain('user-1');
        });

        it('should leave conversation', () => {
            service.joinConversation('user-1', 'conv-1');
            service.leaveConversation('user-1', 'conv-1');
            expect(service.getConversationUsers('conv-1')).not.toContain('user-1');
        });
    });

    describe('typing status', () => {
        it('should set typing status', () => {
            service.joinConversation('user-1', 'conv-1');
            service.setTypingStatus('user-1', 'conv-1', true);

            expect(service.getTypingUsers('conv-1')).toContain('user-1');

            service.setTypingStatus('user-1', 'conv-1', false);
            expect(service.getTypingUsers('conv-1')).not.toContain('user-1');
        });
    });

    describe('online users', () => {
        it('should return correct counts and ids', () => {
            const socket1 = { id: 'socket-1' } as Socket;
            const socket2 = { id: 'socket-2' } as Socket;

            service.trackUserConnection(socket1, 'user-1');
            service.trackUserConnection(socket2, 'user-2');

            expect(service.getOnlineUsersCount()).toBe(2);
            expect(service.getOnlineUserIds()).toEqual(expect.arrayContaining(['user-1', 'user-2']));
        });
    });
});
