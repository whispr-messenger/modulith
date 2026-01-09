import { ConversationMember } from './conversation-member.entity';

describe('ConversationMember Entity', () => {
    const createMember = (overrides: Partial<ConversationMember> = {}): ConversationMember => {
        const member = new ConversationMember();
        member.id = 'member-id';
        member.conversationId = 'conv-id';
        member.userId = 'user-id';
        member.settings = {};
        member.isActive = true;
        member.lastReadAt = null;
        Object.assign(member, overrides);
        return member;
    };

    describe('isAdmin', () => {
        it('should return true if role is admin', () => {
            const member = createMember({ settings: { role: 'admin' } });
            expect(member.isAdmin()).toBe(true);
        });

        it('should return false if role is member', () => {
            const member = createMember({ settings: { role: 'member' } });
            expect(member.isAdmin()).toBe(false);
        });

        it('should return false if no role set', () => {
            const member = createMember({ settings: {} });
            expect(member.isAdmin()).toBe(false);
        });
    });

    describe('isMuted', () => {
        it('should return true if muted is true', () => {
            const member = createMember({ settings: { muted: true } });
            expect(member.isMuted()).toBe(true);
        });

        it('should return false if muted is false', () => {
            const member = createMember({ settings: { muted: false } });
            expect(member.isMuted()).toBe(false);
        });

        it('should return false if muted is not set', () => {
            const member = createMember({ settings: {} });
            expect(member.isMuted()).toBe(false);
        });
    });

    describe('markAsRead', () => {
        it('should set lastReadAt to current date', () => {
            const member = createMember();
            member.markAsRead();

            expect(member.lastReadAt).toBeInstanceOf(Date);
        });

        it('should set lastReadAt to provided date', () => {
            const member = createMember();
            const date = new Date('2024-01-01');
            member.markAsRead(date);

            expect(member.lastReadAt).toBe(date);
        });
    });

    describe('defaultSettings', () => {
        it('should return default settings object', () => {
            const settings = ConversationMember.defaultSettings();

            expect(settings).toEqual({
                role: 'member',
                notifications: true,
                muted: false,
            });
        });
    });
});
