const cron = require("node-cron")
const { CurrentCoin, HistoryCoin } = require("../models/Coin")
const coinGeckoService = require("./coinGeckoService")

// Use a closure to maintain internal state like isRunning
function createCronService() {
  let isRunning = false

  async function updateCoinData() {
    if (isRunning) {
      console.log("Cron job already running, skipping...")
      return
    }

    isRunning = true
    console.log("Starting scheduled coin data update...")

    try {
      // Fetch latest data from CoinGecko
      const coinData = await coinGeckoService.getTopCoins(10)
      console.log(`Fetched data for ${coinData.length} coins`)

      // Update current data (upsert =>  If no document matches the filter, insert a new one using the provided data.)
      const currentUpdatePromises = coinData.map((coin) =>
        CurrentCoin.findOneAndUpdate({ coinId: coin.coinId }, coin, { upsert: true, new: true })
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
      isRunning = false
      console.log("Cron job completed")
    }
  }

  function startCronJob() {
    // Schedule to run every hour at minute 0
    cron.schedule(
      "0 * * * *",
      () => {
        updateCoinData()
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    )

    console.log("Cron job scheduled to run every hour")

    // Run immediately on startup
    setTimeout(() => {
      updateCoinData()
    }, 5000) // 5-second delay after startup
  }

  return {
    startCronJob,
    updateCoinData,
  }
}

const cronService = createCronService()

module.exports = {
  startCronJob: cronService.startCronJob,
  updateCoinData: cronService.updateCoinData,
}
