/**
 * jobs/campaignExpiryCron.js
 * Runs daily at 2:00 AM — finds expired fiat campaigns, notifies donors.
 *
 * Usage in server.js:
 *   import { scheduleExpiryCheck } from './jobs/campaignExpiryCron.js'
 *   scheduleExpiryCheck()   // call after mongoose connects
 *
 * Manual test:
 *   import { runExpiryCheckNow } from './jobs/campaignExpiryCron.js'
 *   await runExpiryCheckNow()
 */

import cron  from 'node-cron'
import axios from 'axios'

const API_URL     = process.env.API_URL         || 'http://localhost:5000/api'
const ADMIN_TOKEN = process.env.ADMIN_CRON_TOKEN || ''

async function triggerExpiryCheck() {
  const response = await axios.post(
    `${API_URL}/campaigns/process-expired-campaigns`,
    {},
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
  )
  return response.data
}

// ── Schedule: every day at 02:00 AM ──────────────────────────────────────────
export function scheduleExpiryCheck() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[CampaignExpiryCron] Running daily expiry check:', new Date().toISOString())
    try {
      const result = await triggerExpiryCheck()
      console.log('[CampaignExpiryCron] Done:', result)
      if (result.errors?.length) {
        console.warn('[CampaignExpiryCron] Some errors occurred:', result.errors)
      }
    } catch (err) {
      console.error('[CampaignExpiryCron] Failed:', err.message)
      if (err.response) console.error('Response:', err.response.data)
    }
  })

  console.log('[CampaignExpiryCron] Scheduled — runs daily at 02:00 AM')
}

// ── Manual trigger (for testing / admin routes) ───────────────────────────────
export async function runExpiryCheckNow() {
  console.log('[CampaignExpiryCron] Manual trigger:', new Date().toISOString())
  const result = await triggerExpiryCheck()
  console.log('[CampaignExpiryCron] Manual result:', result)
  return result
}
