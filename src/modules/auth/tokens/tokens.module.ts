import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { TokensController } from './controllers/tokens.controller';
import { TokensService } from './services/tokens.service';

@Module({
	providers: [TokensService],
	controllers: [TokensController],
	imports: [JwtModule, CacheModule.register()],
	exports: [TokensService, JwtModule],
})
export class TokensModule {}
