const express = require("express")
const { CurrentCoin, HistoryCoin } = require("../models/Coin")
const coinGeckoService = require("../services/coinGeckoService")
const { updateCoinData } = require("../services/cronService")
const authRoutes = require("./auth")

const router = express.Router()

router.use("/auth", authRoutes);

// GET /api/coins - Fetch current top 10 cryptocurrencies
router.get("/coins", async (req, res) => {
  try {
    // Try to get data from database first
    let coins = await CurrentCoin.find().sort({ rank: 1 }).limit(10).lean()

    // If no data in database or data is older than 30 minutes, fetch from API
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    const needsUpdate = coins.length === 0 || coins.some((coin) => new Date(coin.lastUpdated) < thirtyMinutesAgo)

    if (needsUpdate) {
      console.log("Fetching fresh data from CoinGecko...")
      try {
        const freshData = await coinGeckoService.getTopCoins(10)

        // Update database
        const updatePromises = freshData.map((coin) =>
          CurrentCoin.findOneAndUpdate({ coinId: coin.coinId }, coin, { upsert: true, new: true }),
        )

        coins = await Promise.all(updatePromises)
        console.log("Updated database with fresh data")
      } catch (apiError) {
        console.warn("API fetch failed, using cached data:", apiError.message)
        // Continue with cached data if API fails
      }
    }

    // Format response
    const formattedCoins = coins.map((coin) => ({
      id: coin.coinId,
      name: coin.name,
      symbol: coin.symbol,
      price: coin.price,
      marketCap: coin.marketCap,
      priceChange24h: coin.priceChange24h,
      image: coin.image,
      rank: coin.rank,
      lastUpdated: coin.lastUpdated,
    }))

    res.json({
      success: true,
      data: formattedCoins,
      count: formattedCoins.length,
      lastUpdated: coins[0]?.lastUpdated || new Date(),
    })
  } catch (error) {
    console.error("Error fetching coins:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch cryptocurrency data",
      message: error.message,
    })
  }
})

// POST /api/history - Manually trigger data snapshot
router.post("/history", async (req, res) => {
  try {
    await updateCoinData()

    res.json({
      success: true,
      message: "Historical data snapshot created successfully",
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Error creating history snapshot:", error)
    res.status(500).json({
      success: false,
      error: "Failed to create historical snapshot",
      message: error.message,
    })
  }
})

// GET /api/history/:coinId - Get historical data for a specific coin
router.get("/history/:coinId", async (req, res) => {
  try {
    const { coinId } = req.params
    const { days = 7, limit = 168 } = req.query // Default 7 days, max 168 hours

    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - Number.parseInt(days))

    const historyData = await HistoryCoin.find({
      coinId: coinId,
      timestamp: { $gte: daysAgo },
    })
      .sort({ timestamp: -1 })
      .limit(Number.parseInt(limit))
      .lean()

    if (historyData.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No historical data found for this coin",
      })
    }

    // Format for chart data
    const chartData = historyData.reverse().map((record) => ({
      timestamp: record.timestamp,
      price: record.price,
      marketCap: record.marketCap,
      priceChange24h: record.priceChange24h,
    }))

    res.json({
      success: true,
      coinId: coinId,
      data: chartData,
      count: chartData.length,
      period: `${days} days`,
    })
  } catch (error) {
    console.error("Error fetching coin history:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch historical data",
      message: error.message,
    })
  }
})

// GET /api/stats - Get database statistics
router.get("/stats", async (req, res) => {
  try {
    const currentCount = await CurrentCoin.countDocuments()
    const historyCount = await HistoryCoin.countDocuments()

    const latestUpdate = await CurrentCoin.findOne().sort({ lastUpdated: -1 }).select("lastUpdated").lean()

    const oldestHistory = await HistoryCoin.findOne().sort({ timestamp: 1 }).select("timestamp").lean()

    res.json({
      success: true,
      stats: {
        currentCoins: currentCount,
        historicalRecords: historyCount,
        latestUpdate: latestUpdate?.lastUpdated,
        oldestRecord: oldestHistory?.timestamp,
        serverTime: new Date(),
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    })
  }
})

module.exports = router
