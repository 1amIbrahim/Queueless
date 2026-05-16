import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import hospitalsRouter from './routes/hospitals'
import tokensRouter from './routes/tokens'
import queuesRouter from './routes/queues'
import notificationsRouter from './routes/notifications'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use('/hospitals', hospitalsRouter)
app.use('/tokens', tokensRouter)
app.use('/queues', queuesRouter)
app.use('/notifications', notificationsRouter)

app.listen(PORT, () => {
  console.log(`QueueLess API running on http://localhost:${PORT}`)
})

export default app
