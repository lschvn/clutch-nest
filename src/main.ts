import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AnalyticsInterceptor } from './infrastructure/analytics/analytics.interceptor';
import { AnalyticsService } from './infrastructure/analytics/analytics.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Use default HTTP adapter (Express)
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS for all origins
  app.enableCors({
    origin: configService.get<string>('APP_WEB_URL', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  /**
   * Global interceptor for analytics
   *
   * This interceptor will log analytics data for each request
   * Configured to use the AnalyticsService in /infrastructure/analytics
   * @global
   * @interceptor
   * @class AnalyticsInterceptor
   */
  app.useGlobalInterceptors(
    new AnalyticsInterceptor(app.get(AnalyticsService)),
  );

  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle(configService.get<string>('OPEN_API_TITLE', 'Clutch Esport API'))
    .setDescription(
      configService.get<string>(
        'OPEN_API_DESCRIPTION',
        'Clutch Esport API Documentation',
      ),
    )
    .setVersion(configService.get<string>('OPEN_API_VERSION', '1.0.0'))
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(
    configService.get<string>('OPEN_API_PATH', 'docs'),
    app,
    documentFactory,
  );

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  const port = configService.get<number>('APP_PORT', 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
