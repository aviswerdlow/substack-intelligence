import express from 'express'
import payload from 'payload'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Initialize Payload
const start = async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET!,
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`)
    }
  })

  // Custom routes (if needed)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Start server
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
    console.log(`Admin URL: http://localhost:${PORT}/admin`)
    console.log(`GraphQL URL: http://localhost:${PORT}/api/graphql`)
  })
}

start()
