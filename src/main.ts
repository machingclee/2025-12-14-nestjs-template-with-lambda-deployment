// Crypto polyfill for Node.js compatibility
if (typeof global.crypto === 'undefined') {
    const crypto = require('crypto');
    global.crypto = crypto.webcrypto || crypto;
}

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { injectAuthLogicIntoSwagger } from './common/config/injectAuthLogicIntoSwagger';
import { AppModule } from './modules/app/app.module';
import { configNestComponents } from './common/config/configNestjsComponents';

function configSwagger(app: INestApplication<any>) {
    const config = new DocumentBuilder()
        .setVersion('1.0')
        .setTitle('File Generation API')
        .setDescription('File generation API with base URL at http://localhost:5090')
        .addServer('http://localhost:5090')
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, document);
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        cors: true,
    });

    // Trust proxy
    app.set('trust proxy', 1);

    // Enable CORS
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: '*',
        credentials: false,
        maxAge: 3600,
        optionsSuccessStatus: 200,
        preflightContinue: false,
    });

    // Add global prefix if needed
    // app.setGlobalPrefix('api');

    injectAuthLogicIntoSwagger(app);
    configSwagger(app);
    configNestComponents(app);

    await app.listen(process.env.PORT ?? 5090).then(() => {
        console.log(`Listening on port ${process.env.PORT ?? 5090}`);
    });
}

bootstrap();
