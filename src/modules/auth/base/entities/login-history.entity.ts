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
import { Device } from '../../devices/entities/device.entity';

@Entity('login_history')
@Index(['userId'])
@Index(['deviceId'])
@Index(['createdAt'])
export class LoginHistory {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@Column({ name: 'device_id', type: 'uuid', nullable: true })
	deviceId: string;

	@Column({ name: 'ip_address', type: 'varchar', length: 45 })
	ipAddress: string;

	@Column({ name: 'user_agent', type: 'text', nullable: true })
	userAgent: string;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@Column({ name: 'status', type: 'varchar', length: 20 })
	status: string;

	@ManyToOne(() => UserAuth, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: UserAuth;

	@ManyToOne(() => Device, { onDelete: 'SET NULL' })
	@JoinColumn({ name: 'device_id' })
	device: Device;
}
