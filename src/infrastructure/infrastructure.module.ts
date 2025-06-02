import { Module } from '@nestjs/common';
import { MailerModule } from './mailer/mailer.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [MailerModule, AnalyticsModule, DatabaseModule],
  exports: [MailerModule, AnalyticsModule, DatabaseModule],
})
export class InfrastructureModule {}
