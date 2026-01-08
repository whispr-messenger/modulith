import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
} from 'typeorm';
import { UserAuth } from '../../common/entities/user-auth.entity';

@Entity('identity_keys')
@Unique(['userId'])
export class IdentityKey {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'public_key', type: 'text' })
	publicKey: string;

	@Column({ name: 'private_key_encrypted', type: 'text', nullable: true })
	privateKeyEncrypted: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;
}