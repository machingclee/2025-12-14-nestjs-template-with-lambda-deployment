import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponse {
    statusCode: number;
    message: string;
}

export class BaseException extends HttpException {
    constructor(
        params: {
            message: string,
            status: HttpStatus
        }
    ) {
        const { message, status = HttpStatus.BAD_REQUEST } = params;
        const response: ErrorResponse = {
            statusCode: status,
            message,
        };
        super(response, status);
    }
} 