import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BetService } from './bet.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AuthentificatedRequest } from 'express';

@Controller('bet')
export class BetController {
  constructor(private readonly betService: BetService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createBetDto: CreateBetDto,
    @Request() req: AuthentificatedRequest,
  ) {
    return this.betService.create(createBetDto, req.user);
  }

  @Get()
  findAll() {
    return this.betService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.betService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBetDto: UpdateBetDto) {
    return this.betService.update(+id, updateBetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.betService.remove(+id);
  }
}
