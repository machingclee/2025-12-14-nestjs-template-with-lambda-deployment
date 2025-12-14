import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { GlobalExceptionFilter } from '../filters/GlobalExceptionFilter';
import { TransactionInterceptor } from '../interceptors/transaction.interceptor';

export const configNestComponents = (app: INestApplication) => {
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(
        new TransactionInterceptor(app.get(DataSource), app.get(Reflector)),
    );

    // // Enable validation
    // app.useGlobalPipes(
    //     new ValidationPipe({
    //         transform: true, // Automatically transform payloads to DTO instances
    //         whitelist: true, // Strip properties that don't have decorators
    //         forbidNonWhitelisted: true, // Throw errors if non-whitelisted properties are present
    //         transformOptions: {
    //             enableImplicitConversion: true, // Enable implicit conversion
    //         },
    //     }),
    // );
};
