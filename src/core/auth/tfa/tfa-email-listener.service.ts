import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export interface TwoFactorLoginCodePayload {
  email: string;
  name: string;
  code: string;
}

@Injectable()
export class TfaEmailListenerService {
  @OnEvent('auth.2fa.send_login_code')
  async handleSendTwoFactorLoginCode(payload: TwoFactorLoginCodePayload) {
    // In a real application, this would use an email service (e.g., MailerService)
    // For now, we just log to the console to simulate email sending.
    console.log(
      `[TfaEmailListenerService] Simulating sending email to: ${payload.email}`,
    );
    console.log(`  User: ${payload.name}`);
    console.log(`  2FA Code: ${payload.code}`);
    // Example of what real email sending logic might look like:
    // try {
    //   await this.mailerService.sendMail({
    //     to: payload.email,
    //     subject: 'Your Two-Factor Login Code',
    //     template: './twoFactorLoginCode', // if using NestJS Mailer templates
    //     context: { name: payload.name, code: payload.code },
    //   });
    //   console.log(`2FA login code email sent to ${payload.email}`);
    // } catch (error) {
    //   console.error(`Failed to send 2FA login code email to ${payload.email}`, error);
    // }
  }
}
