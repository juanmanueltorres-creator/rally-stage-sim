import { mkdir, writeFile } from 'node:fs/promises'

const FEED_URL = 'https://webappsdata.wrc.com/srv/wrc/json/api/wrcsrv/queryMeta?t=%22Event%22&p=%7B%22n%22%3A%22category%22%2C%22v%22%3A%22WRC%22%7D&maxdepth=1'
const KML_BASE_URL = 'https://webapps2.wrc.com/2020/web/live/kml'
const TARGET = process.env.WRC_KML_TARGET || 'chile_2026'
const OUTPUT_DIR = `artifacts/wrc-geometry-probe/${TARGET}`

function metadataValue(event, name) {
  const entry = Array.isArray(event?._meta) ? event._meta.find((item) => item?.n === name) : null
  return typeof entry?.v === 'string' ? entry.v : null
}

function summarizeEvent(event) {
  const meta = Object.fromEntries(
    (Array.isArray(event?._meta) ? event._meta : [])
      .filter((item) => typeof item?.n === 'string')
      .map((item) => [item.n, item.v ?? null]),
  )

  return {
    id: event?.id ?? event?._id ?? null,
    meta,
  }
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const feedText = await fetchText(FEED_URL)
  const feed = JSON.parse(feedText)
  if (!Array.isArray(feed)) throw new Error('WRC event feed did not return an array')

  const events = feed.map(summarizeEvent)
  const kmlFiles = events
    .map((event) => event.meta.kmlfile)
    .filter((value) => typeof value === 'string')

  const matched = feed.find((event) => metadataValue(event, 'kmlfile') === TARGET)
  const report = {
    checkedAt: new Date().toISOString(),
    target: TARGET,
    feedUrl: FEED_URL,
    availableKmlFiles: kmlFiles,
    found: Boolean(matched),
    matchedEvent: matched ? summarizeEvent(matched) : null,
    kmlUrl: null,
    kmlBytes: 0,
  }

  if (matched) {
    const kmlUrl = `${KML_BASE_URL}/${TARGET}.xml`
    const kml = await fetchText(kmlUrl)
    report.kmlUrl = kmlUrl
    report.kmlBytes = Buffer.byteLength(kml)
    await writeFile(`${OUTPUT_DIR}/${TARGET}.xml`, kml, 'utf8')
  }

  await writeFile(`${OUTPUT_DIR}/probe.json`, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

main().catch(async (error) => {
  await mkdir(OUTPUT_DIR, { recursive: true })
  const report = {
    checkedAt: new Date().toISOString(),
    target: TARGET,
    error: error instanceof Error ? error.message : String(error),
  }
  await writeFile(`${OUTPUT_DIR}/probe.json`, JSON.stringify(report, null, 2), 'utf8')
  console.error(report.error)
  process.exitCode = 1
})
