const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const coinRoutes = require("./routes/coins")
const { startCronJob } = require("./services/cronService")

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use(limiter)

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

app.use(express.json())

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/crypto-tracker", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB")
    // Start cron job after database connection
    startCronJob()
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error)
  })

// Routes
app.use("/api", coinRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error)
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})

module.exports = app
