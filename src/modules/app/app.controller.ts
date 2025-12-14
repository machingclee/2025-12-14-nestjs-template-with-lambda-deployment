import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
    constructor(private readonly configService: ConfigService) {}

    @Get()
    healthCheck() {
        return {
            success: true,
            commitHash: this.configService.get('COMMIT_HASH'),
            env: this.configService.get('env'),
        };
    }
}
