import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

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
 * Retrieves database configuration from individual environment variables
 */
function getEnvDatabaseConfig(configService: ConfigService): DatabaseConfig {
    return {
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', DEFAULT_POSTGRES_PORT),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_NAME', 'user_service'),
    };
}

function getDataSourceOptions(configService: ConfigService): DataSourceOptions {
    // https://typeorm.io/docs/data-source/data-source-options/
    return {
        // RDBMS type. You must specify what database engine you use
        type: 'postgres',
        // Scans all modules folders to load the Entities
        entities: [__dirname + '/../../../**/*.entity{.ts,.js}'],
        // Indicates if logging is enabled or not. If set to true then query and error logging will be enabled.
        logging: configService.get('DATABASE_LOGGING', 'false') === 'true',
        // Migrations to be loaded and used for this data source
        migrations: [__dirname + '/../../../database/migrations/*{.ts,.js}'],
        // Indicates if migrations should be auto-run on every application launch.
        migrationsRun: configService.get('DATABASE_MIGRATIONS_RUN', 'false') === 'true',
        // Indicates if database schema should be auto created on every application launch.
        // Be careful with this option and don't use this in production - otherwise you can lose production data.
        synchronize: configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true',
    };
}

/**
 * Factory function to create TypeORM configuration based on environment
 */
export async function typeOrmModuleOptionsFactory(
    configService: ConfigService
): Promise<TypeOrmModuleOptions> {
    const databaseUrl = configService.get('DB_URL');
    const databaseConfig = databaseUrl ? parseDatabaseUrl(databaseUrl) : getEnvDatabaseConfig(configService);

    const dataSourceOptions: DataSourceOptions = getDataSourceOptions(configService);

    return {
        ...databaseConfig,
        ...dataSourceOptions,
    } as TypeOrmModuleOptions;
}