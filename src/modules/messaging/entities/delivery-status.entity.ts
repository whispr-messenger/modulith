import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('delivery_statuses', { schema: 'messaging' })
@Unique(['messageId', 'userId'])
@Index(['userId', 'deliveredAt'])
@Index(['messageId'])
export class DeliveryStatus {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'message_id' })
    messageId: string;

    @Column({ type: 'uuid', name: 'user_id' })
    @Index()
    userId: string;

    @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
    deliveredAt: Date | null;

    @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
    readAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Message, (message: Message) => message.deliveryStatuses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'message_id' })
    message: Message;

    // Helper methods
    markAsDelivered(timestamp?: Date): void {
        this.deliveredAt = timestamp || new Date();
    }

    markAsRead(timestamp?: Date): void {
        const now = timestamp || new Date();
        if (!this.deliveredAt) {
            this.deliveredAt = now;
        }
        this.readAt = now;
    }

    isDelivered(): boolean {
        return this.deliveredAt !== null;
    }

    isRead(): boolean {
        return this.readAt !== null;
    }
}
