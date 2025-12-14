import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';

interface DotenvResult {
    parsed?: { [key: string]: string };
    error?: Error;
}

@Module({
    controllers: [AppController],
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [
                () => {
                    const dotenv = require('dotenv');
                    const fs = require('fs');

                    const localEnv: DotenvResult = dotenv.config({ path: '.env' });
                    if (localEnv.error) {
                        console.error('Error loading .env:', localEnv.error);
                    }

                    const internalEnvPath = '.env.local.internal';
                    let internalEnv: DotenvResult = { parsed: {} };

                    if (fs.existsSync(internalEnvPath)) {
                        internalEnv = dotenv.config({ path: internalEnvPath });
                        if (internalEnv.error) {
                            console.error(
                                'Error loading .env.local.internal:',
                                internalEnv.error,
                            );
                        }
                    } else {
                        console.warn('.env.internal file not found');
                    }

                    return {
                        ...localEnv.parsed,
                        ...internalEnv.parsed,
                    };
                },
            ],
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                console.log("configService.get('POSTGRES_HOST')", configService.get('POSTGRES_HOST'));
                console.log("configService.get('POSTGRES_USER')", configService.get('POSTGRES_USER'));
                console.log(
                    "configService.get('POSTGRES_PASSWORD')",
                    configService.get('POSTGRES_PASSWORD'),
                );
                console.log(
                    "configService.get('POSTGRES_DATABASE')",
                    configService.get('POSTGRES_DATABASE'),
                );

                return {
                    type: 'postgres',
                    synchronize: false,
                    autoLoadEntities: true,
                    port: 5432,
                    logging: false,
                    ssl: true,
                    extra: {
                        ssl: {
                            rejectUnauthorized: false,
                        },
                    },
                    entities: [

                    ],
                    host: configService.get('POSTGRES_HOST'),
                    username: configService.get('POSTGRES_USER'),
                    password: configService.get('POSTGRES_PASSWORD'),
                    database: configService.get('POSTGRES_DATABASE'),
                };
            },
        }),
    ],
})

export class AppModule {
    onModuleInit() {
        process.on('uncaughtException', err => {
            console.error('Uncaught Exception:', err.stack);
            console.info('Node NOT Exiting...');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
}
