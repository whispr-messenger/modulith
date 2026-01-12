import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Service responsible for generating and managing verification codes.
 * Handles code generation, hashing, and comparison operations.
 */
@Injectable()
export class VerificationCodeGeneratorService {
	private readonly DEFAULT_CODE_LENGTH = 6;
	private readonly DEFAULT_BCRYPT_ROUNDS = 10;

	/**
	 * Generates a random numeric verification code.
	 * @param length - Length of the code to generate (default: 6)
	 * @returns A string containing the numeric code
	 */
	public generateCode(length: number = this.DEFAULT_CODE_LENGTH): string {
		const min = Math.pow(10, length - 1);
		const max = Math.pow(10, length) - 1;
		return Math.floor(min + Math.random() * (max - min + 1)).toString();
	}

	/**
	 * Hashes a verification code using bcrypt.
	 * @param code - The code to hash
	 * @param rounds - Number of bcrypt rounds (default: 10)
	 * @returns The hashed code
	 */
	public async hashCode(code: string, rounds: number = this.DEFAULT_BCRYPT_ROUNDS): Promise<string> {
		return bcrypt.hash(code, rounds);
	}

	/**
	 * Compares a plain text code with its hashed version.
	 * @param code - The plain text code
	 * @param hashedCode - The hashed code to compare against
	 * @returns True if the codes match, false otherwise
	 */
	public async compareCode(code: string, hashedCode: string): Promise<boolean> {
		return bcrypt.compare(code, hashedCode);
	}
}
