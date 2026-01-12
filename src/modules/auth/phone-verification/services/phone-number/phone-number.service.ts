import { BadRequestException, Injectable } from '@nestjs/common';
import { parsePhoneNumberWithError, PhoneNumber } from 'libphonenumber-js';

/**
 * Service responsible for phone number operations.
 * Handles normalization, validation, and parsing of phone numbers.
 */
@Injectable()
export class PhoneNumberService {
	/**
	 * Normalizes a phone number to E.164 format.
	 * @param phoneNumber - The phone number to normalize
	 * @returns The normalized phone number in E.164 format
	 * @throws BadRequestException if the phone number is invalid
	 */
	public normalize(phoneNumber: string): string {
		try {
			const parsed = parsePhoneNumberWithError(phoneNumber);
			if (!parsed || !parsed.isValid()) {
				throw new BadRequestException('Invalid phone number');
			}
			return parsed.format('E.164');
		} catch {
			throw new BadRequestException('Invalid phone number');
		}
	}

	/**
	 * Validates a phone number without throwing an error.
	 * @param phoneNumber - The phone number to validate
	 * @returns True if valid, false otherwise
	 */
	public validate(phoneNumber: string): boolean {
		try {
			const parsed = parsePhoneNumberWithError(phoneNumber);
			return parsed ? parsed.isValid() : false;
		} catch {
			return false;
		}
	}

	/**
	 * Parses a phone number into a PhoneNumber object.
	 * @param phoneNumber - The phone number to parse
	 * @returns The parsed PhoneNumber object
	 * @throws BadRequestException if the phone number is invalid
	 */
	public parse(phoneNumber: string): PhoneNumber {
		try {
			return parsePhoneNumberWithError(phoneNumber);
		} catch {
			throw new BadRequestException('Invalid phone number');
		}
	}
}
