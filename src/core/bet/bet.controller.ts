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

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Request() req: AuthentificatedRequest) {
    return this.betService.findAll(req.user);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthentificatedRequest) {
    return this.betService.findOne(+id, req.user);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBetDto: UpdateBetDto,
    @Request() req: AuthentificatedRequest,
  ) {
    return this.betService.update(+id, updateBetDto, req.user);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthentificatedRequest) {
    return this.betService.remove(+id, req.user);
  }
}
