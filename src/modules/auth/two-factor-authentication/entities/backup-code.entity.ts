import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserAuth } from '../../common/entities/user-auth.entity';

@Entity({ name: 'backup_codes', schema: 'auth' })
@Index(['userId'])
export class BackupCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'code_hash', type: 'varchar', length: 255 })
    codeHash: string;

    @Column({ name: 'used', type: 'boolean', default: false })
    used: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'used_at', type: 'timestamp', nullable: true })
    usedAt: Date;

    @ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: UserAuth;
}