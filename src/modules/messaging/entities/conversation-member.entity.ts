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
        // Paramètres personnels existants
        role?: 'admin' | 'member';
        notifications?: boolean;
        muted?: boolean;
        nickname?: string;
        
        // Nouveaux paramètres personnels
        showReadReceipts?: boolean;        // Envoi des accusés de lecture
        showTypingIndicator?: boolean;     // Affichage "en train d'écrire"
        soundEnabled?: boolean;            // Son des notifications
        muteUntil?: Date | null;          // Silencieux jusqu'à (remplace muted simple)
        customNickname?: string | null;    // Surnom personnalisé (direct)
        
        // Paramètres de conversation (groupes uniquement)
        retentionDays?: number | null;          // Durée conservation messages
        allowReadReceipts?: boolean;            // Autoriser accusés de lecture
        allowTypingIndicators?: boolean;        // Autoriser indicateurs de frappe
        messageEditTimeLimit?: number;          // Limite temps modification (minutes)
    };

    @Column({ type: 'boolean', default: false, name: 'is_pinned' })
    isPinned: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_archived' })
    isArchived: boolean;

    @Column({ type: 'timestamp', nullable: true, name: 'archived_at' })
    archivedAt: Date | null;

    @Column({ type: 'timestamp', name: 'joined_at' })
    joinedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'last_read_at' })
    lastReadAt: Date | null;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Conversation, (conversation: Conversation) => conversation.members, { onDelete: 'CASCADE' })
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
            showReadReceipts: true,
            showTypingIndicator: true,
            soundEnabled: true,
            muteUntil: null,
            customNickname: null,
            retentionDays: null,  // illimité
            allowReadReceipts: true,
            allowTypingIndicators: true,
            messageEditTimeLimit: 15,
        };
    }
}
