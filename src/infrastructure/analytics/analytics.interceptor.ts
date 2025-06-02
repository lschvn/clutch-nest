import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from './analytics.service';

/**
 * @class AnalyticsInterceptor
 * @classdesc This interceptor is responsible for logging and providing insights into incoming HTTP requests.
 * It measures the duration of each request and logs relevant information such as method, URL, status code,
 * referrer, and duration to the console. This information can be used for monitoring and analyzing
 * the performance and usage patterns of the application.
 * @implements {NestInterceptor}
 */
@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AnalyticsInterceptor.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const data = {
          method: request.method,
          url: request.url,
          status: response.statusCode,
          referrer: request.get('referer') || 'Direct',
          duration: Date.now() - now,
        };

        this.analyticsService.save(data);

        this.logger.log(`[${data.method}] ${data.url} - ${data.duration}ms`);
      }),
    );
  }
}
