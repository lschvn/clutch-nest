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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BetService } from './bet.service';
import { CreateBetDto } from './dto/create-bet.dto';
import { UpdateBetDto } from './dto/update-bet.dto';
import { AuthGuard } from '../auth/auth.guard';
import { AuthentificatedRequest } from 'express';
import { Bet } from './entities/bet.entity';

@ApiBearerAuth()
@ApiTags('Bets')
@Controller('bet')
export class BetController {
  constructor(private readonly betService: BetService) {}

  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({ summary: 'Place a new bet' })
  @ApiBody({ type: CreateBetDto })
  @ApiResponse({
    status: 201,
    description: 'The bet has been successfully placed.',
    type: Bet,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(
    @Body() createBetDto: CreateBetDto,
    @Request() req: AuthentificatedRequest,
  ): Promise<Bet> {
    return this.betService.create(createBetDto, req.user);
  }

  @UseGuards(AuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all bets for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user bets.',
    type: [Bet],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Request() req: AuthentificatedRequest): Promise<Bet[]> {
    return this.betService.findAll(req.user);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific bet by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the bet', type: Number })
  @ApiResponse({ status: 200, description: 'The found bet.', type: Bet })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Bet not found.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthentificatedRequest,
  ): Promise<Bet> {
    return this.betService.findOne(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a bet by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the bet to update', type: Number })
  @ApiBody({ type: UpdateBetDto })
  @ApiResponse({
    status: 200,
    description: 'The bet has been successfully updated.',
    type: Bet,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Bet not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBetDto: UpdateBetDto,
    @Request() req: AuthentificatedRequest,
  ): Promise<Bet> {
    return this.betService.update(id, updateBetDto, req.user);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bet by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the bet to delete', type: Number })
  @ApiResponse({
    status: 200,
    description: 'The bet has been successfully deleted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Bet not found.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthentificatedRequest,
  ): Promise<void> {
    return this.betService.remove(id, req.user);
  }
}
