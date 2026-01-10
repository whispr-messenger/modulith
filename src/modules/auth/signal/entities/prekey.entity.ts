import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
	Unique,
} from 'typeorm';
import { UserAuth } from '../../common/entities/user-auth.entity';
import { Device } from '../../devices/entities/device.entity';

@Entity({ name: 'prekeys', schema: 'auth' })
@Index(['userId', 'deviceId'])
@Index(['userId', 'deviceId', 'isUsed'], { where: 'is_used = false' })
@Unique(['userId', 'deviceId', 'keyId'])
export class PreKey {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'device_id', type: 'uuid' })
	deviceId: string;

	@Column({ name: 'key_id', type: 'integer' })
	keyId: number;

	@Column({ name: 'public_key', type: 'text' })
	publicKey: string;

	@Column({ name: 'is_one_time', type: 'boolean', default: true })
	isOneTime: boolean;

	@Column({ name: 'is_used', type: 'boolean', default: false })
	isUsed: boolean;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;

	@ManyToOne(() => Device, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'device_id' })
	device: Device;
}
