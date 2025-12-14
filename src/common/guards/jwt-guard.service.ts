import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    HttpStatus,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { BaseException } from '../exceptions/base.exception';
import { JwtTokenPayload } from '../types/dto';

@Injectable()
export class JWTGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException();
        }

        try {
            const decoded = verify(
                token,
                this.configService.get('JWT_SECRET') || '',
            ) as JwtTokenPayload;
            request.user = decoded;
            return true;
        } catch (error) {
            console.error('JWT decode error:', JSON.stringify(error));
            const errorName = error.name;

            if (errorName === 'TokenExpiredError') {
                throw new BaseException({
                    message: 'JWT_EXPIRED',
                    status: HttpStatus.UNAUTHORIZED,
                });

            } else {
                throw new BaseException({
                    message: error.message,
                    status: HttpStatus.UNAUTHORIZED,
                });
            }
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader) return undefined;

        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
}
