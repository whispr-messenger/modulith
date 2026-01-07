import { Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';

// Environment variables
const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: '.env',
};


@Module({
  imports: [ConfigModule.forRoot(configModuleOptions)],
})
export class AppModule { }