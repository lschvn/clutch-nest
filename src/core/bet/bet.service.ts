import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { User } from '../users/entities/user.entity';
import { MatchesService } from '../matches/matches.service';
import { MatchStatus } from '../matches/enums/matches.enum';
import { Bet } from './entities/bet.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class BetService {
  constructor(
    private readonly matchService: MatchesService,
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  async create(createBetDto: CreateBetDto, user: User) {
    // need to check if user is logged in
    if (!user) {
      throw new UnauthorizedException('User is not logged in');
    }

    // need to check if the user has enough tokens to bet
    if (user.balance < createBetDto.amount) {
      throw new BadRequestException('User does not have enough tokens');
    }
    // need to check if the match is still open for betting
    const match = await this.matchService.getById(createBetDto.matchId);
    if (match.status !== MatchStatus.UPCOMING) {
      throw new BadRequestException('Match is not open for betting');
    }

    // need to check if the match has already started
    if (match.startsAt < new Date()) {
      throw new BadRequestException('Match has already started');
    }

    // need to check if the bet is already placed, won or lost
    const existingBet = await this.betRepository.findOne({
      where: {
        match: { id: createBetDto.matchId },
        user: { id: user.id },
      },
    });
    if (existingBet) {
      if (existingBet.status !== 'pending') {
        throw new BadRequestException('Bet already exists');
      }
      throw new BadRequestException('Bet already exists');
    }

    // save the bet
    const bet = this.betRepository.create({
      match: { id: createBetDto.matchId },
      user: { id: user.id },
      bettedTeam: { id: createBetDto.bettedTeamId },
      amount: createBetDto.amount,
    });

    // return the saved bet
    return this.betRepository.save(bet);
  }

  findAll() {
    return `This action returns all bet`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bet`;
  }

  update(id: number, updateBetDto: UpdateBetDto) {
    return `This action updates a #${id} bet`;
  }

  remove(id: number) {
    return `This action removes a #${id} bet`;
  }
}
