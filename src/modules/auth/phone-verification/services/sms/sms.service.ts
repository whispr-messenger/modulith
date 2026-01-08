import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
	private readonly logger = new Logger(SmsService.name);
	private readonly twilioAccountSid: string;
	private readonly twilioAuthToken: string;
	private readonly twilioPhoneNumber: string;
	private readonly isDevelopment: boolean;
	private readonly isDemoMode: boolean;

	constructor(private readonly configService: ConfigService) {
		this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
		this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
		this.twilioPhoneNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') || '';
		this.isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';
		this.isDemoMode = this.configService.get<string>('DEMO_MODE') === 'true';
	}

	async sendVerificationCode(phoneNumber: string, code: string, purpose: string): Promise<void> {
		const message = this.buildMessage(code, purpose);

		if (this.isDemoMode) {
			this.logger.log(
				`[DEMO MODE] SMS to ${phoneNumber}: the verification code is in the response payload.`
			);
			return;
		}

		if (this.isDevelopment) {
			this.logger.log(`[DEV MODE] SMS to ${phoneNumber}: ${message}`);
			return;
		}

		try {
			await this.sendSms(phoneNumber, message);
			this.logger.log(`SMS sent successfully to ${phoneNumber}`);
		} catch (error) {
			this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
			throw new HttpException("Erreur lors de l'envoi du SMS", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	private buildMessage(code: string, purpose: string): string {
		const purposeText =
			{
				registration: 'inscription',
				login: 'connexion',
				recovery: 'récupération de compte',
			}[purpose] || 'vérification';

		return `Votre code de ${purposeText} Whispr: ${code}. Ce code expire dans 15 minutes. Ne le partagez jamais.`;
	}

	private async sendSms(phoneNumber: string, message: string): Promise<void> {
		if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
			throw new Error('Twilio credentials not configured');
		}

		// In a real implementation, you would use the Twilio SDK here
		// For now, we'll simulate the SMS sending
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(
						`${this.twilioAccountSid}:${this.twilioAuthToken}`
					).toString('base64')}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					From: this.twilioPhoneNumber,
					To: phoneNumber,
					Body: message,
				}),
			}
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Twilio API error: ${error}`);
		}
	}

	async sendSecurityAlert(
		phoneNumber: string,
		alertType: 'new_device' | 'suspicious_login' | 'password_change'
	): Promise<void> {
		const messages = {
			new_device:
				"Un nouvel appareil s'est connecté à votre compte Whispr. Si ce n'était pas vous, sécurisez votre compte immédiatement.",
			suspicious_login:
				'Tentative de connexion suspecte détectée sur votre compte Whispr. Vérifiez votre activité récente.',
			password_change:
				"Le mot de passe de votre compte Whispr a été modifié. Si ce n'était pas vous, contactez le support immédiatement.",
		};

		const message = messages[alertType];

		if (this.isDevelopment) {
			this.logger.log(`[DEV MODE] Security alert to ${phoneNumber}: ${message}`);
			return;
		}

		try {
			await this.sendSms(phoneNumber, message);
			this.logger.log(`Security alert sent to ${phoneNumber}`);
		} catch (error) {
			this.logger.error(`Failed to send security alert to ${phoneNumber}:`, error);
			// Don't throw here as security alerts are not critical for user flow
		}
	}
}
