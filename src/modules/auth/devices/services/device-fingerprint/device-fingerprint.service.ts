import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DeviceFingerprint } from '../../types/device-fingerprint.interface';

/**
 * Service responsible for extracting device fingerprints from HTTP requests
 */
@Injectable()
export class DeviceFingerprintService {
	/**
	 * Extract device fingerprint from HTTP request
	 * @param req - Express request object
	 * @param deviceType - Optional device type, if not provided will be auto-detected
	 * @returns DeviceFingerprint object containing user agent, IP, device type and timestamp
	 */
	extractFingerprint(req: Request, deviceType?: string): DeviceFingerprint {
		return {
			userAgent: req.headers['user-agent'],
			ipAddress: req.ip,
			deviceType: deviceType || this.detectDeviceType(req.headers['user-agent']),
			timestamp: Date.now(),
		};
	}

	/**
	 * Detect device type from user agent string
	 * @param userAgent - User agent string from HTTP headers
	 * @returns Device type: 'mobile', 'tablet', 'desktop', or 'unknown'
	 */
	private detectDeviceType(userAgent?: string): string {
		if (!userAgent) return 'unknown';
		
		const ua = userAgent.toLowerCase();
		if (ua.includes('mobile')) return 'mobile';
		if (ua.includes('tablet')) return 'tablet';
		return 'desktop';
	}
}
