import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = () => Reflector.createDecorator<{ limit: number; windowMs: number }>();

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rateLimitConfig = this.reflector.get(RateLimit, context.getHandler());

        if (!rateLimitConfig) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const key = this.generateKey(request, context);
        const now = Date.now();

        // Get or create rate limit entry
        let entry = rateLimitStore.get(key);
        if (!entry || now > entry.resetTime) {
            entry = { count: 0, resetTime: now + 60000 }; // 1 minute window
            rateLimitStore.set(key, entry);
        }

        if (entry.count >= 10) {
            // Default limit of 10 requests per minute
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Trop de tentatives. Veuillez réessayer plus tard.',
                    retryAfter: Math.ceil((entry.resetTime - now) / 1000),
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        // Increment counter
        entry.count++;

        // Add rate limit headers
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', 10);
        response.setHeader('X-RateLimit-Remaining', Math.max(0, 10 - entry.count));
        response.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

        return true;
    }

    private generateKey(request: Request, context: ExecutionContext): string {
        const ip = request.ip || request.connection.remoteAddress || 'unknown';
        const route = context.getHandler().name;
        const controller = context.getClass().name;
        return `rate_limit:${controller}:${route}:${ip}`;
    }
}