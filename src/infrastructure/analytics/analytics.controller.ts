import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({
    summary: 'Get global analytics statistics',
    description:
      'Retrieves global statistics about system usage and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns global statistics about the analytics',
    schema: {
      example: {
        database: {
          players: 3,
          total: 10,
        },
        requestDuration: {
          averageDuration: 26,
          percentiles: {
            p50: 12,
            p95: 62,
            p99: 350,
          },
          medianDuration: 12,
        },
      },
    },
  })
  @Get('stats')
  async getStats() {
    return await this.analyticsService.getStats();
  }

  @ApiOperation({
    summary: 'Get analytics by year',
    description: 'Retrieves analytics data for a specific year',
  })
  @ApiParam({
    name: 'year',
    type: Number,
    description: 'The year to fetch analytics for (e.g., 2023)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the analytics for the specified year',
  })
  @ApiResponse({
    status: 404,
    description: 'No data found for this year',
  })
  @Get('year/:year')
  async getByYear(@Param('year', ParseIntPipe) year: number) {
    const data = await this.analyticsService.getByYear(year);
    if (!data.length)
      throw new NotFoundException(`No analytics found for year ${year}`);
    return data;
  }

  @ApiOperation({
    summary: 'Get analytics by month',
    description:
      'Retrieves analytics data for a specific month in a given year',
  })
  @ApiParam({
    name: 'year',
    type: Number,
    description: 'The year to fetch analytics for',
    required: true,
  })
  @ApiParam({
    name: 'month',
    type: Number,
    description: 'The month to fetch analytics for (1-12)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the analytics for the specified month',
  })
  @ApiResponse({
    status: 404,
    description: 'No data found for this month',
  })
  @Get('month/:year/:month')
  async getByMonth(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    const data = await this.analyticsService.getByMonth(year, month);
    if (!data.length)
      throw new NotFoundException(
        `No analytics found for year ${year} and month ${month}`,
      );
    return data;
  }

  @ApiOperation({
    summary: 'Get analytics by day',
    description:
      'Retrieves analytics data for a specific day in a given year and month',
  })
  @ApiParam({
    name: 'year',
    type: Number,
    description: 'The year to fetch analytics for',
    required: true,
  })
  @ApiParam({
    name: 'month',
    type: Number,
    description: 'The month to fetch analytics for (1-12)',
    required: true,
  })
  @ApiParam({
    name: 'day',
    type: Number,
    description: 'The day to fetch analytics for (1-31)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the analytics for the specified day',
  })
  @ApiResponse({
    status: 404,
    description: 'No data found for this day',
  })
  @Get('day/:year/:month/:day')
  async getByDay(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Param('day', ParseIntPipe) day: number,
  ) {
    const data = await this.analyticsService.getByDay(year, month, day);
    if (!data.length)
      throw new NotFoundException(
        `No analytics found for year ${year}, month ${month} and day ${day}`,
      );
    return data;
  }
}
