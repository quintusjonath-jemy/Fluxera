import http from 'http'

export function startTestServer(port = 45678): Promise<http.Server> {
  // Generate 16 MB test payload
  const testPayload = Buffer.alloc(16 * 1024 * 1024, 0x41) // 16 MB of 'A'

  const server = http.createServer((req, res) => {
    const url = req.url || '/'

    // 1. Redirect endpoint
    if (url === '/redirect') {
      res.writeHead(302, { Location: '/ranged-file.bin' })
      res.end()
      return
    }

    // 2. Server refusal endpoint
    if (url === '/refusal') {
      res.writeHead(503, { 'Retry-After': '1' })
      res.end('Server Busy')
      return
    }

    // 3. Non-ranged endpoint (ignores Range header and sends 200 OK)
    if (url === '/non-ranged.bin') {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': '1048576',
        'Content-Disposition': 'attachment; filename="non-ranged.bin"'
      })
      res.end(testPayload.subarray(0, 1048576))
      return
    }

    // 4. Standard Ranged file endpoint (/ranged-file.bin or /)
    const totalSize = testPayload.length
    const rangeHeader = req.headers.range

    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1

      const chunk = testPayload.subarray(start, end + 1)

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk.length.toString(),
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="test-ubuntu.iso"',
        'ETag': '"test-etag-12345"',
        'Last-Modified': 'Wed, 21 Oct 2026 07:28:00 GMT'
      })
      res.end(chunk)
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize.toString(),
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="test-ubuntu.iso"',
        'ETag': '"test-etag-12345"',
        'Last-Modified': 'Wed, 21 Oct 2026 07:28:00 GMT'
      })
      res.end(testPayload)
    }
  })

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server)
    })
  })
}
