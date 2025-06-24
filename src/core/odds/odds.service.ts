import { Injectable } from '@nestjs/common';

/**
 * Service for managing odds.
 *
 * @description The workflow for creating odds is as follows:
 *
 * 1. Fetch Upcoming Matches:
 *    - A scheduled cron job periodically fetches all upcoming matches from an external API.
 *
 * 2. Scrape Match Data:
 *    - For each new match, the service scrapes the corresponding match page from a data source (e.g., vlr.gg).
 *
 * 3. Gather and Store Team Information:
 *    - Extracts and stores all relevant information about the two competing teams, including player statistics and recent performance.
 *
 * 4. Elo-based Odds Calculation:
 *    - An `EloService` calculates the Elo ratings for each team.
 *    - This service analyzes the historical performance of each team against their past opponents.
 *    - The initial odds for the match are generated based on these Elo ratings.
 *
 * 5. Create and Store Odds:
 *    - The calculated odds are then stored in the database and associated with the corresponding match.
 * 
 * @requires EloService - This service is a dependency for handling Elo rating calculations.
 */
@Injectable()
export class OddsService {

    /**
     * Scheduled cron job 
     */
    async getUpcomingMatches() {
        const res = await fetch("https://vlrggapi.vercel.app/match?q=upcoming")
        const data = await res.json()

        // check if team is present in our database, 
        //      if yes, do nothing
        //      if no, add to database and create elo based on all the matches

        
    }

}
