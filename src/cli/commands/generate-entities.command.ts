import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import * as path from 'path';

@Injectable()
@Command({
    name: 'generate-entities',
    description: 'Generate TypeORM entities from database using typeorm-extension',
})
export class GenerateEntitiesCommand extends CommandRunner {
    constructor(private configService: ConfigService) {
        super();
    }

    async run(): Promise<void> {
        try {
            console.log('Generating entities from database...');
            // Path to the generation script
            const scriptPath = path.resolve(
                process.cwd(),

                'scripts/generate-entities.ts',
            );

            // Execute the script with environment variables from the config service
            const result = execSync(`ts-node ${scriptPath}`, {
                env: {
                    ...process.env,
                    DB_HOST: this.configService.get('DB_HOST'),
                    DB_USER: this.configService.get('DB_USER'),
                    DB_PASSWORD: this.configService.get('DB_PASSWORD'),
                    DB_DATABASE: this.configService.get('DB_DATABASE'),
                    NODE_TLS_REJECT_UNAUTHORIZED: '0', // Disable SSL certificate verification
                },
                stdio: 'inherit',
            });

            console.log('Entity generation completed successfully!');
        } catch (error) {
            console.error('Failed to generate entities:', error);
            throw error;
        }
    }
}
