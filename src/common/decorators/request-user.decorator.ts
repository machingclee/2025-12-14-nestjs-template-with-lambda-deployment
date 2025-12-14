import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();

        // If no user object exists (perhaps the guard wasn't applied)
        if (!request.user) {
            return null;
        }

        // If a specific property is requested, return only that property
        if (data) {
            return request.user[data];
        }

        // Otherwise return the entire user object
        return request.user;
    },
);
