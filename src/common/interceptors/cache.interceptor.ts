import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CacheInterceptor.name);
    private readonly cache = new Map<string, { data: any; timestamp: number }>();
    private readonly ttl = 60000; // 1 minute cache TTL

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;

        // Only cache GET requests
        if (method !== 'GET') {
            return next.handle();
        }

        const cacheKey = `${method}:${url}`;
        const cachedResponse = this.cache.get(cacheKey);

        if (cachedResponse && Date.now() - cachedResponse.timestamp < this.ttl) {
            this.logger.debug(`Cache hit for ${cacheKey}`);
            return of(cachedResponse.data);
        }

        return next.handle().pipe(
            tap((data) => {
                this.logger.debug(`Caching response for ${cacheKey}`);
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                });
            }),
        );
    }
} 