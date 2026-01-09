import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Unique, } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_members', { schema: 'messaging' })
@Unique(['conversationId', 'userId'])
@Index(['userId', 'isActive'])
@Index(['conversationId', 'isActive'])
export class ConversationMember {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'conversation_id' })
    conversationId: string;

    @Column({ type: 'uuid', name: 'user_id' })
    @Index()
    userId: string;

    @Column({ type: 'simple-json', default: {} })
    settings: {
        role?: 'admin' | 'member';
        notifications?: boolean;
        muted?: boolean;
        nickname?: string;
    };

    @Column({ type: 'timestamp', nullable: true, name: 'last_read_at' })
    lastReadAt: Date | null;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne('Conversation', (conversation) => conversation.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    // Helper methods
    isAdmin(): boolean {
        return this.settings?.role === 'admin';
    }

    isMuted(): boolean {
        return this.settings?.muted === true;
    }

    markAsRead(timestamp?: Date): void {
        this.lastReadAt = timestamp || new Date();
    }

    static defaultSettings(): ConversationMember['settings'] {
        return {
            role: 'member',
            notifications: true,
            muted: false,
        };
    }
}
