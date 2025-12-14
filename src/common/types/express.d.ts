import { JwtTokenPayload } from '../common/types/JwtTokenPayload';

declare global {
    namespace Express {
        interface Request {
            user?: JwtTokenPayload;
            accessToken?: string;
        }
    }
} 