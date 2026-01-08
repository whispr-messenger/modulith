import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokensService } from '../../tokens/services/tokens.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly tokenService: TokensService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();
		const token = this.extractTokenFromHeader(request);

		if (!token) {
			throw new UnauthorizedException("Token d'accès requis");
		}

		try {
			const payload = this.tokenService.validateToken(token);

			const isRevoked = await this.tokenService.isTokenRevoked(payload.sub);
			if (isRevoked) {
				throw new UnauthorizedException('Token révoqué');
			}

			request.user = payload;
			return true;
		} catch {
			throw new UnauthorizedException('Token invalide');
		}
	}

	private extractTokenFromHeader(request: any): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}
}