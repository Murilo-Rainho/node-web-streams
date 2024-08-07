import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

const PORT = 3000

createServer(async (request, response) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*'
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end('finished')
    return
  }

  let lines = 0
  request.once('close', () => console.log(`processed ${lines} lines`))
  Readable.toWeb(createReadStream('./animeflv.csv'))
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({
      transform(chunk, conttroller) {
        const data = JSON.parse(Buffer.from(chunk))
        const assembledData = {
          title: data.title,
          description: data.description,
          url_anime: data.url_anime
        }
        conttroller.enqueue(JSON.stringify(assembledData).concat('\n'))
      }
    }))
    .pipeTo(new WritableStream({
      async write(chunk) {
        await setTimeout(1000)
        lines += 1
        response.write(chunk)
      },
      close() {
        response.end(`processed ${lines} lines`)
      }
    }))

  response.writeHead(200, headers)
})
  .listen(PORT)
  .on('listening', () => console.log(`server is running at port ${PORT}`))
