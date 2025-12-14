import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    HttpException,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { CustomLogger } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let errorMessage = 'An error occurred';
        let httpStatus: HttpStatus = HttpStatus.BAD_REQUEST;

        if (exception instanceof BaseException) {
            errorMessage = exception.message;
            httpStatus = exception.getStatus();
        }

        // Extract error message from different exception types
        else if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();
            errorMessage =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : (exceptionResponse as any).message || exception.message;
        }
        // normal error
        else if (exception instanceof Error) {
            errorMessage = exception.message;
        }

        this.logger.error(errorMessage);

        response.status(httpStatus).json({
            success: false,
            errorMessage: errorMessage,
        });
    }
}
