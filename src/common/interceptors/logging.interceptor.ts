import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, headers } = request;
        const now = Date.now();

        // Log request details with more information
        this.logger.log(
            `Incoming Request: ${method} ${url}`,
            {
                headers: this.sanitizeHeaders(headers),
                body: this.sanitizeBody(body),
                contentType: headers['content-type'],
                debug: {
                    hasBody: !!body,
                    bodyType: body ? typeof body : 'undefined',
                    bodyKeys: body ? Object.keys(body) : []
                }
            },
        );

        return next.handle().pipe(
            tap({
                next: (responseBody) => {
                    const response = context.switchToHttp().getResponse();
                    const delay = Date.now() - now;

                    // Log both successful and unsuccessful responses
                    if (responseBody && responseBody.success === false) {
                        this.logger.warn(
                            `Unsuccessful Response: ${method} ${url} ${response.statusCode} - ${delay}ms`,
                            {
                                response: responseBody,
                                request: {
                                    body: this.sanitizeBody(body),
                                    method,
                                    url
                                }
                            },
                        );
                    } else {
                        this.logger.log(
                            `Outgoing Response: ${method} ${url} ${response.statusCode} - ${delay}ms`,
                            {
                                response: responseBody,
                                request: {
                                    body: this.sanitizeBody(body),
                                    method,
                                    url
                                }
                            },
                        );
                    }
                },
                error: (error) => {
                    const response = context.switchToHttp().getResponse();
                    const delay = Date.now() - now;
                    this.logger.error(
                        `Error Response: ${method} ${url} ${response.statusCode} - ${delay}ms`,
                        {
                            error: error.message,
                            stack: error.stack,
                            request: {
                                body: this.sanitizeBody(body),
                                method,
                                url
                            }
                        },
                    );
                }
            })
        );
    }

    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        // Remove sensitive information
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    private sanitizeBody(body: any): any {
        if (!body) return 'No body';

        const sanitized = { ...body };
        // Remove sensitive fields if they exist
        if (sanitized.password) delete sanitized.password;
        if (sanitized.token) delete sanitized.token;
        if (sanitized.accessToken) delete sanitized.accessToken;
        if (sanitized.refreshToken) delete sanitized.refreshToken;

        return sanitized;
    }
} 