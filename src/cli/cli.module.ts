import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenerateEntitiesCommand } from './commands/generate-entities.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
    }),
  ],
  providers: [GenerateEntitiesCommand],
})
export class CliModule { }
