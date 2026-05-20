import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import hospitalsRouter from './routes/hospitals'
import tokensRouter from './routes/tokens'
import queuesRouter from './routes/queues'
import notificationsRouter from './routes/notifications'
import authRouter from './routes/auth'

const app = express()
const PORT = process.env.PORT ?? 4000

const corsOriginList = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : []

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true)
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true)
    }
    if (corsOriginList.length === 0) return callback(null, true)
    if (corsOriginList.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
}

app.use(cors(corsOptions))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use('/hospitals', hospitalsRouter)
app.use('/tokens', tokensRouter)
app.use('/queues', queuesRouter)
app.use('/notifications', notificationsRouter)
app.use('/auth', authRouter)

app.listen(PORT, () => {
  console.log(`QueueLess API running on http://localhost:${PORT}`)
})

export default app
