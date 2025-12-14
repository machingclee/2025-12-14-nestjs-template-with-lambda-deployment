import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLogger implements LoggerService {
    private context?: string;
    private logger: Logger;

    constructor() {
        this.logger = createLogger({
            format: format.combine(
                format.timestamp(),
                format.ms(),
                format.errors({ stack: true }),
                format.json(),
            ),
            transports: [
                new transports.Console({
                    format: format.combine(
                        format.colorize(),
                        format.printf(({ context, level, message, timestamp, ...meta }) => {
                            return `${timestamp} [${context}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''
                                }`;
                        }),
                    ),
                }),
            ],
        });
    }

    setContext(context: string) {
        this.context = context;
    }

    log(message: string, ...meta: any[]) {
        this.logger.info(message, { context: this.context, ...meta });
    }

    error(message: string, trace?: string, ...meta: any[]) {
        this.logger.error(message, { context: this.context, trace, ...meta });
    }

    warn(message: string, ...meta: any[]) {
        this.logger.warn(message, { context: this.context, ...meta });
    }

    debug(message: string, ...meta: any[]) {
        this.logger.debug(message, { context: this.context, ...meta });
    }

    verbose(message: string, ...meta: any[]) {
        this.logger.verbose(message, { context: this.context, ...meta });
    }
} 