import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export async function jwtModuleOptionsFactory(configService: ConfigService): Promise<JwtModuleOptions> {
	return {
		privateKey: configService.get<string>('JWT_PRIVATE_KEY'),
		publicKey: configService.get<string>('JWT_PUBLIC_KEY'),
		signOptions: {
			algorithm: 'ES256',
			expiresIn: '1h',
		},
		verifyOptions: {
			algorithms: ['ES256'],
		},
	};
}