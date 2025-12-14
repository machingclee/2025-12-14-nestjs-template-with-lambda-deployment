import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { DataSource } from 'typeorm';
import MetaDataKey from '../decorators/MetaDataKey';
import { firstValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
    private readonly logger = new Logger(TransactionInterceptor.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly reflector: Reflector,
    ) { }

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const classRef = context.getClass();

        this.logger.debug(
            `Checking transaction metadata for ${classRef.name}.${handler.name}`,
        );

        const isTransactional = this.reflector.get<boolean>(
            MetaDataKey.TRANSACTION_KEY,
            handler,
        );

        if (!isTransactional) {
            return next.handle();
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        // Store the transaction manager in the request
        request.transactionManager = queryRunner.manager;

        try {
            const result = await firstValueFrom(next.handle());
            await queryRunner.commitTransaction();
            return of(result);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
