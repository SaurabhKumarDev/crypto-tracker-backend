const axios = require("axios")

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

async function getTopCoins(limit = 10) {
  try {
    const res = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: limit,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
    })

    return res.data.map((coin) => ({
      coinId: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      marketCap: coin.market_cap,
      priceChange24h: coin.price_change_percentage_24h || 0,
      image: coin.image,
      rank: coin.market_cap_rank,
      lastUpdated: new Date(),
    }))
  } catch (err) {
    console.error("Failed to fetch top coins:", err.message)
    throw err
  }
}

async function getCoinHistory(coinId, days = 7) {
  try {
    const res = await axios.get(`${COINGECKO_API_URL}/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: "usd",
        days,
        interval: days > 1 ? "hourly" : "minutely",
      },
    })

    return res.data.prices.map(([timestamp, price]) => ({
      timestamp: new Date(timestamp),
      price,
    }))
  } catch (err) {
    console.error(`Failed to fetch history for ${coinId}:`, err.message)
    throw err
  }
}

module.exports = {
  getTopCoins,
  getCoinHistory,
}
