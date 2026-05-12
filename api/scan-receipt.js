/**
 * Vercel serverless function — Receipt OCR via Anthropic Claude vision.
 *
 * POST /api/scan-receipt
 * Body: { file_urls: string[] }
 * Returns: { merchant, total, receipt_date, suggested_category, confidence }
 *
 * Requires env var: ANTHROPIC_API_KEY
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Receipt scanning is not configured (missing ANTHROPIC_API_KEY)' })
  }

  const { file_urls } = req.body ?? {}
  if (!file_urls || file_urls.length === 0) {
    return res.status(400).json({ error: 'No file_urls provided' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: file_urls[0] },
              },
              {
                type: 'text',
                text: `You are a receipt OCR assistant. Analyze this receipt and return ONLY valid JSON with these exact fields:
{
  "merchant": "store or restaurant name (string or null)",
  "total": final total as a number with no currency symbol (number or null),
  "receipt_date": "date in YYYY-MM-DD format (string or null)",
  "suggested_category": one of: "groceries", "meals", "misc", "personal",
  "confidence": "high", "medium", or "low"
}

Rules:
- Grocery stores (Walmart, Kroger, Aldi, etc.) → "groceries"
- Restaurants, fast food, cafes, diners → "meals"
- Gas stations, convenience stores → "misc"
- Pharmacies, personal care → "personal"
- total = FINAL total after tax, not subtotal
- If a field is unclear or missing, use null`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('Anthropic API error:', response.status, body)
      return res.status(502).json({ error: 'Upstream AI error' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? '{}'

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return res.status(200).json({ confidence: 'low' })
    }

    const parsed = JSON.parse(match[0])
    return res.status(200).json(parsed)
  } catch (err) {
    console.error('scan-receipt error:', err)
    return res.status(500).json({ error: 'Internal error during receipt scan' })
  }
}
