import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessDto } from '../types/Success.dto';

@Injectable()
export class SuccessInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map(data => {
                if (data instanceof SuccessDto) {
                    return data;
                }
                return new SuccessDto(data);
            }),
        );
    }
}
