import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { Handler, Context, Callback } from 'aws-lambda';
import * as awsServerlessExpress from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import { CustomLogger } from './common/logger/logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppModule } from './modules/app/app.module';
import { configNestComponents } from './common/config/configNestjsComponents';

let cachedServer: any;
let cachedNestApp: any;

async function bootstrap() {
    if (!cachedServer) {
        const expressApp = express();

        expressApp.use(express.json({ limit: '50mb' }));
        expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
        expressApp.use(eventContext());

        const nestApp = await NestFactory.create(
            AppModule,
            new ExpressAdapter(expressApp),
            {
                cors: {
                    origin: '*',
                    allowedHeaders: '*',
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
                    credentials: false,
                },
                logger: new CustomLogger(),
                bodyParser: true,
                abortOnError: false,
                bufferLogs: false,
                autoFlushLogs: true,
            },
        );

        nestApp.useGlobalInterceptors(new LoggingInterceptor());

        cachedNestApp = nestApp;
        configNestComponents(cachedNestApp);
        await nestApp.init();

        cachedServer = awsServerlessExpress.createServer(expressApp, undefined, [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
    return cachedServer;
}
export const handler: Handler = async (
    event: any,
    context: Context,
    callback: Callback,
) => {
    try {
        context.callbackWaitsForEmptyEventLoop = false;

        // Handle favicon requests quickly
        if (event.path === '/favicon.ico') {
            console.log('Favicon request - returning 404');
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Not Found',
            };
        }

        console.log('=== PROCESSING REQUEST ===');
        console.log('Method:', event.httpMethod);
        console.log('Original path:', event.path);
        console.log(
            'multiValueQueryStringParameters:',
            event.multiValueQueryStringParameters,
        );

        // Handle headers from ALB
        if (!event.headers) {
            event.headers = {};
        }

        // Convert multiValueHeaders to regular headers
        if (event.multiValueHeaders) {
            event.headers = Object.entries(event.multiValueHeaders).reduce(
                (acc, [key, value]) => ({
                    ...acc,
                    [key.toLowerCase()]: Array.isArray(value) ? value[0] : value,
                }),
                event.headers,
            );
        }

        // 🔥 ONLY convert multiValueQueryStringParameters to queryStringParameters
        // DO NOT modify the path!
        if (event.multiValueQueryStringParameters) {
            const queryParams: Record<string, string> = {};

            for (const [key, values] of Object.entries(
                event.multiValueQueryStringParameters,
            )) {
                if (Array.isArray(values) && values.length > 0) {
                    // Just take the first value, no extra decoding needed
                    queryParams[key] = values[0];
                }
            }

            console.log('Converted query params:', queryParams);
            event.queryStringParameters = queryParams;
        }

        // Handle body from ALB
        if (event.body) {
            if (typeof event.body !== 'string') {
                event.body = JSON.stringify(event.body);
            }
            if (!event.headers['content-type']) {
                event.headers['content-type'] = 'application/json';
            }
        }

        // Ensure all headers are properly formatted
        event.headers = Object.entries(event.headers).reduce(
            (acc, [key, value]) => ({
                ...acc,
                [key.toLowerCase()]: value,
            }),
            {},
        );

        console.log('Final event for aws-serverless-express:');
        console.log('- path:', event.path);
        console.log('- queryStringParameters:', event.queryStringParameters);

        const server = await bootstrap();
        return awsServerlessExpress
            .proxy(server, event, context, 'PROMISE')
            .promise.then(res => {
                return {
                    ...res,
                    headers: {
                        ...res.headers,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers':
                            'Content-Type, Authorization, X-Requested-With',
                    },
                    multiValueHeaders: Object.entries(res.headers).reduce(
                        (acc, [key, value]) => ({
                            ...acc,
                            [key]: Array.isArray(value) ? value : [value],
                        }),
                        {},
                    ),
                };
            });
    } catch (error) {
        console.error('Lambda handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message,
            }),
        };
    }
};
