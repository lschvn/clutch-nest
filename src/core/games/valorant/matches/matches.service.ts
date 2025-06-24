import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';

@Injectable()
export class MatchesService {
    constructor(
        @InjectRepository(Match)
        private matchesRepository: Repository<Match>,
    ) {}

    async create(match: Partial<Match>): Promise<Match> {
        const newMatch = this.matchesRepository.create(match);
        return this.matchesRepository.save(newMatch);
    }

    async findAll(): Promise<Match[]> {
        return this.matchesRepository.find();
    }

    async findOne(id: number): Promise<Match> {
        return this.matchesRepository.findOneOrFail({where: {id}});
    }

    async update(id: number, match: Partial<Match>): Promise<Match> {
        await this.matchesRepository.update(id, match);
        return this.matchesRepository.findOneOrFail({where: {id}});
    }

    async remove(id: number): Promise<void> {
        await this.matchesRepository.delete(id);
    }
}
