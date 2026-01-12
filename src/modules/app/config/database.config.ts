import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables for CLI usage (migrations only)
// NestJS application uses ConfigModule instead
config();

const DEFAULT_POSTGRES_PORT = 5432;

interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

/**
 * Parses a database connection URL into config components
 */
function parseDatabaseUrl(url: string): DatabaseConfig {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: Number.parseInt(parsed.port, 10) || DEFAULT_POSTGRES_PORT,
        username: parsed.username,
        password: parsed.password,
        database: parsed.pathname.slice(1),
    };
}

/**
 * Factory function to create TypeORM configuration for NestJS
 * Used with TypeOrmModule.forRootAsync() in app.module.ts
 * 
 * @param configService - Injected by NestJS from ConfigModule
 * @returns TypeORM configuration using NestJS ConfigService
 */
export function typeOrmModuleOptionsFactory(
    configService: ConfigService
): TypeOrmModuleOptions {
    const databaseUrl = configService.get('DB_URL');

    const databaseConfig = databaseUrl
        ? parseDatabaseUrl(databaseUrl)
        : {
            host: configService.get('DB_HOST', 'postgres'),
            port: configService.get('DB_PORT', DEFAULT_POSTGRES_PORT),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'password'),
            database: configService.get('DB_NAME', 'whispr'),
        };

    return {
        type: 'postgres',
        ...databaseConfig,
        // Scans all modules folders to load the Entities
        entities: [__dirname + '/../../../**/*.entity{.ts,.js}'],
        // Indicates if logging is enabled or not. If set to true then query and error logging will be enabled.
        logging: configService.get('DB_LOGGING', 'false') === 'true',
        // Migrations to be loaded and used for this data source
        migrations: [__dirname + '/../../../database/migrations/*{.ts,.js}'],
        // Indicates if migrations should be auto-run on every application launch.
        migrationsRun: configService.get('DB_MIGRATIONS_RUN', 'false') === 'true',
        // Indicates if database schema should be auto created on every application launch.
        // Be careful with this option and don't use this in production - otherwise you can lose production data.
        synchronize: configService.get('DB_SYNCHRONIZE', 'false') === 'true',
    } as TypeOrmModuleOptions;
}

/**
 * DataSource for TypeORM CLI commands (migrations, etc.)
 * Uses dotenv directly since CLI runs outside NestJS context
 * 
 * Used by: npm run migration:*
 * Export named as AppDataSource for TypeORM CLI compatibility
 */
const getDatabaseConfigForCLI = () => {
    const databaseUrl = process.env.DB_URL;

    if (databaseUrl) {
        const parsed = parseDatabaseUrl(databaseUrl);
        return {
            host: parsed.host,
            port: parsed.port,
            username: parsed.username,
            password: parsed.password,
            database: parsed.database,
        };
    }

    return {
        host: process.env.DB_HOST || 'postgres',
        port: Number.parseInt(process.env.DB_PORT || String(DEFAULT_POSTGRES_PORT), 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'whispr',
    };
};

export const AppDataSource = new DataSource({
    type: 'postgres',
    ...getDatabaseConfigForCLI(),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
});