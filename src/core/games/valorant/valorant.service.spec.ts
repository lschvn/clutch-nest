import { Test, TestingModule } from '@nestjs/testing';
import { ValorantService } from './valorant.service';

describe('ValorantService', () => {
  let service: ValorantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValorantService],
    }).compile();

    service = module.get<ValorantService>(ValorantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
