import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Analytics } from './entities/analytics.entity';
import { Between, DataSource, Repository } from 'typeorm';
/**
 * Service responsible for managing analytics operations and data retrieval.
 * Provides methods to store and retrieve analytics data based on different time periods.
 */
@Injectable()
export class AnalyticsService {
  /**
   * Creates a new instance of the AnalyticsService
   * @param analyticsRepository - TypeORM repository for handling analytics data persistence
   */
  constructor(
    @InjectRepository(Analytics)
    private analyticsRepository: Repository<Analytics>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Persists analytics data to the database
   * @param data - Partial analytics object containing the data to be saved
   * @returns Promise resolving to the saved analytics entity with complete data
   */
  async save(data: Partial<Analytics>): Promise<Analytics> {
    return this.analyticsRepository.save(data);
  }
  /**
   * Fetches analytics data for a specific year
   * @param year - The target year (e.g., 2023)
   * @returns Promise resolving to an array of analytics entries, sorted by creation date in descending order
   */
  async getByYear(year: number): Promise<Analytics[]> {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return this.analyticsRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Retrieves analytics data for a specific month in a given year
   * @param year - The target year (e.g., 2023)
   * @param month - The target month (1-12)
   * @returns Promise resolving to an array of analytics entries, sorted by creation date in descending order
   */
  async getByMonth(year: number, month: number): Promise<Analytics[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return this.analyticsRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Fetches analytics data for a specific day
   * @param year - The target year (e.g., 2023)
   * @param month - The target month (1-12)
   * @param day - The target day (1-31)
   * @returns Promise resolving to an array of analytics entries, sorted by creation date in descending order
   */
  async getByDay(
    year: number,
    month: number,
    day: number,
  ): Promise<Analytics[]> {
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);
    return this.analyticsRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Return stats on the data stored in the db
   */
  async getStats() {
    return {
      database: {
        total: await this.getTotalRows(),
      },
      requestDuration: {
        averageDuration: await this.getAverageDuration(),
        percentiles: await this.getDurationPercentiles(),
      },
    };
  }

  async getTotalRows(): Promise<number> {
    interface QueryResult {
      total_rows: string;
    }
    const [result] = await this.dataSource.query<QueryResult[]>(
      'SELECT SUM(n_live_tup) AS total_rows FROM pg_stat_user_tables',
    );
    return Number(result?.total_rows) || 0;
  }

  async getAverageDuration(): Promise<number> {
    interface AverageDurationResult {
      avgDuration: string;
    }

    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('AVG(analytics.duration)', 'avgDuration')
      .getRawOne<AverageDurationResult>();

    return parseFloat(result?.avgDuration ?? '0') || 0;
  }

  /**
   * Récupère les percentiles de la durée des requêtes :
   * - p50 (médiane)
   * - p95
   * - p99
   */
  async getDurationPercentiles(): Promise<{
    p50: number;
    p95: number;
    p99: number;
  }> {
    // Définir un type pour le résultat de la requête
    type PercentileResult = {
      p50: string;
      p95: string;
      p99: string;
    };

    // Effectuer la requête en castant le résultat au type attendu
    const result = await this.analyticsRepository.query(`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration) AS "p50",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) AS "p95",
        percentile_cont(0.99) WITHIN GROUP (ORDER BY duration) AS "p99"
      FROM analytics
    `);

    return {
      p50: parseFloat(result[0].p50) || 0,
      p95: parseFloat(result[0].p95) || 0,
      p99: parseFloat(result[0].p99) || 0,
    };
  }
}
