const mongoose = require("mongoose")

// Current Data Schema (overwrite every sync)
const currentCoinSchema = new mongoose.Schema(
  {
    coinId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    marketCap: {
      type: Number,
      required: true,
    },
    priceChange24h: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
    },
    rank: {
      type: Number,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// History Data Schema (append new records every hour)
const historyCoinSchema = new mongoose.Schema(
  {
    coinId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    marketCap: {
      type: Number,
      required: true,
    },
    priceChange24h: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
    },
    rank: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Add indexes for better query performance
currentCoinSchema.index({ coinId: 1 })
currentCoinSchema.index({ lastUpdated: -1 })

historyCoinSchema.index({ coinId: 1, timestamp: -1 })
historyCoinSchema.index({ timestamp: -1 })

const CurrentCoin = mongoose.model("CurrentCoin", currentCoinSchema)
const HistoryCoin = mongoose.model("HistoryCoin", historyCoinSchema)

module.exports = {
  CurrentCoin,
  HistoryCoin,
}
