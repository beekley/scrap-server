export const SIMULATION = {
  COST_PER_KWH_ETC: 0.0001,
  TICK_REALTIME_MS: 100, // Real-life ms per tick (handled by game loop, assumed 100ms)
  TICK_GAME_SECONDS: 6, // 6 game-seconds per tick
  DAY_LENGTH_SECONDS: 86400,
  START_TIME_SECONDS: 8 * 3600, // 8 AM
  SALE_TIME_SECONDS: 6 * 3600, // 6 AM
  DELIVERY_TIME_SECONDS: 8 * 3600, // 8 AM
  AUTO_SELL_MULTIPLIER: 0.25, // 25% of base value
}
