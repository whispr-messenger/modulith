import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupCode } from '../entities/backup-code.entity';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BackupCodesService {
	private readonly logger = new Logger(BackupCodesService.name);
	private readonly BCRYPT_ROUNDS = 10;
	private readonly BACKUP_CODES_COUNT = 10;
	private readonly CODE_LENGTH = 8;

	constructor(
		@InjectRepository(BackupCode)
		private readonly backupCodeRepository: Repository<BackupCode>
	) {}

	async generateBackupCodes(userId: string): Promise<string[]> {
		// Delete existing backup codes
		await this.backupCodeRepository.delete({ userId });

		const codes: string[] = [];
		const backupCodes: BackupCode[] = [];

		for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
			const code = this.generateCode();
			const hashedCode = await bcrypt.hash(code, this.BCRYPT_ROUNDS);

			codes.push(code);
			backupCodes.push(
				this.backupCodeRepository.create({
					userId,
					codeHash: hashedCode,
					used: false,
				})
			);
		}

		await this.backupCodeRepository.save(backupCodes);
		this.logger.log(`Generated ${this.BACKUP_CODES_COUNT} backup codes for user ${userId}`);

		return codes;
	}

	async verifyBackupCode(userId: string, code: string): Promise<boolean> {
		const backupCodes = await this.backupCodeRepository.find({
			where: { userId, used: false },
		});

		if (backupCodes.length === 0) {
			throw new NotFoundException('Aucun code de sauvegarde disponible');
		}

		for (const backupCode of backupCodes) {
			const isValid = await bcrypt.compare(code, backupCode.codeHash);
			if (isValid) {
				// Mark the code as used
				backupCode.used = true;
				backupCode.usedAt = new Date();
				await this.backupCodeRepository.save(backupCode);

				this.logger.log(`Backup code used for user ${userId}`);
				return true;
			}
		}

		return false;
	}

	async getRemainingCodesCount(userId: string): Promise<number> {
		return await this.backupCodeRepository.count({
			where: { userId, used: false },
		});
	}

	async hasBackupCodes(userId: string): Promise<boolean> {
		const count = await this.getRemainingCodesCount(userId);
		return count > 0;
	}

	async deleteAllBackupCodes(userId: string): Promise<void> {
		await this.backupCodeRepository.delete({ userId });
		this.logger.log(`Deleted all backup codes for user ${userId}`);
	}

	private generateCode(): string {
		// Generate a random 8-character alphanumeric code
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';

		for (let i = 0; i < this.CODE_LENGTH; i++) {
			const randomIndex = crypto.randomInt(0, chars.length);
			result += chars[randomIndex];

			// Add a dash after every 4 characters for readability
			if (i === 3) {
				result += '-';
			}
		}

		return result;
	}
}
