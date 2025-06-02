import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailerService as MailerProvider } from '@nestjs-modules/mailer';
import { EventPayloads } from './types';


@Injectable()
export class MailerService {
    constructor(private readonly mailerProvider: MailerProvider) {}

  @OnEvent('user.welcome')
  async welcomeEmail(data: EventPayloads['user.welcome']) {
    const { email, name } = data;

    const subject = `Welcome to Company: ${name}`;

    await this.mailerProvider.sendMail({
      to: email,
      subject,
      template: './welcome',
      context: {
        name,
      },
    });
  }

  @OnEvent('user.reset-password')
  async forgotPasswordEmail(data: EventPayloads['user.reset-password']) {
    const { email, name, link } = data;

    const subject = `Reset your password`;

    await this.mailerProvider.sendMail({
      to: email,
      subject,
      template: './reset-password',
      context: {
        name,
        link,
      },
    });
  }

  @OnEvent('user.verify-email')
  async verifyEmail(data: EventPayloads['user.verify-email']) {
    const { email, name, link } = data;

    const subject = `Verify your email`;

    await this.mailerProvider.sendMail({
      to: email,
      subject,
      template: './verify-email',
      context: {
        name,
        link,
      },
    });
  }
}
