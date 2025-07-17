const cron = require("node-cron")
const { CurrentCoin, HistoryCoin } = require("../models/Coin")
const coinGeckoService = require("./coinGeckoService")

class CronService {
  constructor() {
    this.isRunning = false
  }

  async updateCoinData() {
    if (this.isRunning) {
      console.log("Cron job already running, skipping...")
      return
    }

    this.isRunning = true
    console.log("Starting scheduled coin data update...")

    try {
      // Fetch latest data from CoinGecko
      const coinData = await coinGeckoService.getTopCoins(10)
      console.log(`Fetched data for ${coinData.length} coins`)

      // Update current data (upsert)
      const currentUpdatePromises = coinData.map((coin) =>
        CurrentCoin.findOneAndUpdate({ coinId: coin.coinId }, coin, { upsert: true, new: true }),
      )

      await Promise.all(currentUpdatePromises)
      console.log("Updated current coin data")

      // Store historical data
      const historyData = coinData.map((coin) => ({
        ...coin,
        timestamp: new Date(),
      }))

      await HistoryCoin.insertMany(historyData)
      console.log("Stored historical coin data")

      // Clean up old historical data (keep only last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deleteResult = await HistoryCoin.deleteMany({
        timestamp: { $lt: thirtyDaysAgo },
      })

      if (deleteResult.deletedCount > 0) {
        console.log(`Cleaned up ${deleteResult.deletedCount} old historical records`)
      }
    } catch (error) {
      console.error("Error in cron job:", error.message)
    } finally {
      this.isRunning = false
      console.log("Cron job completed")
    }
  }

  startCronJob() {
    // Run every hour at minute 0
    cron.schedule(
      "0 * * * *",
      () => {
        this.updateCoinData()
      },
      {
        scheduled: true,
        timezone: "UTC",
      },
    )

    console.log("Cron job scheduled to run every hour")

    // Run immediately on startup
    setTimeout(() => {
      this.updateCoinData()
    }, 5000) // Wait 5 seconds after startup
  }
}

const cronService = new CronService()

module.exports = {
  startCronJob: () => cronService.startCronJob(),
  updateCoinData: () => cronService.updateCoinData(),
}
