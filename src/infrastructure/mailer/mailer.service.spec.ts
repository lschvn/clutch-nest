import { Test, TestingModule } from '@nestjs/testing';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  let service: MailerService;
  let nestMailerService: NestMailerService;

  beforeEach(async () => {
    const mockNestMailerService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailerService,
        {
          provide: NestMailerService,
          useValue: mockNestMailerService,
        },
      ],
    }).compile();

    service = module.get<MailerService>(MailerService);
    nestMailerService = module.get<NestMailerService>(NestMailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
