import http from 'http'
import https from 'https'
import net from 'net'
import { URL } from 'url'
import path from 'path'
import { ProbeResult } from '../../shared/types'

export interface ProbeOptions {
  timeoutMs?: number
  maxRedirects?: number
  localAddress?: string
}

export async function probeUrl(
  inputUrl: string,
  options: ProbeOptions = {}
): Promise<ProbeResult> {
  const maxRedirects = options.maxRedirects ?? 5
  const timeoutMs = options.timeoutMs ?? 15000

  let currentUrl = inputUrl.trim()
  const visitedUrls = new Set<string>()

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (visitedUrls.has(currentUrl)) {
      throw new Error(`Redirect loop detected for URL: ${currentUrl}`)
    }
    visitedUrls.add(currentUrl)

    const parsedUrl = new URL(currentUrl)
    const isHttps = parsedUrl.protocol === 'https:'
    const client = isHttps ? https : http

    const response = await new Promise<{
      statusCode: number
      headers: http.IncomingHttpHeaders
      finalUrl: string
    }>((resolve, reject) => {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Fluxera/1.0',
        Range: 'bytes=0-0', // Single byte probe
        Accept: '*/*'
      }

      const reqOptions: http.RequestOptions = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers,
        timeout: timeoutMs
      }

      if (options.localAddress && options.localAddress !== '0.0.0.0') {
        reqOptions.localAddress = options.localAddress
        if (net.isIPv4(options.localAddress)) {
          reqOptions.family = 4
        } else if (net.isIPv6(options.localAddress)) {
          reqOptions.family = 6
        }
      }

      const req = client.request(reqOptions, (res) => {
          // Immediately consume / destroy body to avoid memory leaks
          res.resume()
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            finalUrl: currentUrl
          })
        }
      )

      req.on('timeout', () => {
        req.destroy(new Error(`Probe request timed out after ${timeoutMs}ms`))
      })

      req.on('error', (err) => {
        reject(err)
      })

      req.end()
    })

    const { statusCode, headers } = response

    // Handle 3xx Redirects
    if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
      if (hop === maxRedirects) {
        throw new Error(`Exceeded maximum redirect hops of ${maxRedirects}`)
      }
      const redirectUrl = new URL(headers.location, currentUrl).toString()
      currentUrl = redirectUrl
      continue
    }

    if (statusCode < 200 || statusCode >= 400) {
      throw new Error(`Server returned HTTP ${statusCode}: ${http.STATUS_CODES[statusCode] || 'Unknown'}`)
    }

    // Determine range request support
    // Status 206 means Range request was honored
    const rangeSupported = statusCode === 206
    let fileSize = 0

    if (rangeSupported && headers['content-range']) {
      // Content-Range: bytes 0-0/104857600
      const match = headers['content-range'].match(/\/(\d+|\*)/)
      if (match && match[1] !== '*') {
        fileSize = parseInt(match[1], 10)
      }
    }

    if (!fileSize && headers['content-length']) {
      fileSize = parseInt(headers['content-length'] as string, 10)
    }

    const etag = typeof headers.etag === 'string' ? headers.etag : undefined
    const lastModified = typeof headers['last-modified'] === 'string' ? headers['last-modified'] : undefined
    const contentType = typeof headers['content-type'] === 'string' ? headers['content-type'] : undefined

    const suggestedName = extractFilename(headers['content-disposition'], parsedUrl.pathname)

    return {
      url: inputUrl,
      finalUrl: currentUrl,
      suggestedName,
      fileSize: isNaN(fileSize) ? 0 : fileSize,
      rangeSupported,
      etag,
      lastModified,
      contentType
    }
  }

  throw new Error(`Failed to probe URL: max redirects reached`)
}

function extractFilename(contentDisposition?: string, urlPath?: string): string {
  if (contentDisposition) {
    // Check filename*=UTF-8''encoded_name
    const utf8Match = contentDisposition.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/i)
    if (utf8Match && utf8Match[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''))
      } catch {
        // fallback
      }
    }

    // Check filename="name" or filename=name
    const standardMatch = contentDisposition.match(/filename=["']?([^"';]+)["']?/i)
    if (standardMatch && standardMatch[1]) {
      return standardMatch[1].trim()
    }
  }

  if (urlPath) {
    const basename = path.basename(urlPath.split('?')[0])
    if (basename && basename.length > 0 && basename !== '/') {
      return decodeURIComponent(basename)
    }
  }

  return `download_${Date.now()}`
}
