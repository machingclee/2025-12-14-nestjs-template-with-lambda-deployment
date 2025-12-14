import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export const TransactionManager = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): EntityManager | undefined => {
        const request = ctx.switchToHttp().getRequest();
        return request.transactionManager;
    },
); 