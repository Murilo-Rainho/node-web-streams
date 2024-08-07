const API_URL = 'http://localhost:3000'
let counter = 0

async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal
  })
  const readable = response.body
    .pipeThrough(new TextDecoderStream()) // transforma de binário para stream
    .pipeThrough(parseNDJSON()) // realiza o parse de um JSON separado por \n (NDJSON)
    // .pipeTo(new WritableStream({
    //   write(chunk) {
    //     console.log(++counter, 'chunk: ', chunk)
    //   }
    // })) // apenas para depurar e validar que está tudo ok
  return readable
}

function appendToHTML(element, itemCounter) {
  return new WritableStream({
    write({ title, description, url_anime }) {
      const card = `
        <article>
          <div class="text">
            <h3>[${counter++}] - ${title}</h3>
            <p>${description.slice(0, 100)}</p>
            <a href="${url_anime}">Go to anime!!</a>
          </div>
        </article>
      `
      if (counter > itemCounter) element.innerHTML += card
    },
    abort(reason) {
      console.log('finished: ', reason)
    }
  })
}

function parseNDJSON() {
  let ndjsonBuffer = ''
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk
      const items = ndjsonBuffer.split('\n')
      items.slice(0, -1)
        .forEach(item => controller.enqueue(JSON.parse(item)))
      ndjsonBuffer = items[items.length -1]
    },
    flush(controller) {
      if(!ndjsonBuffer) return
      else controller.enqueue(JSON.parse(ndjsonBuffer))
    } // para garantir a integridade dos dados e ter certeza que tudo foi (e será) processado
  })
}

const [start, stop, cards] = ['start', 'stop', 'cards']
  .map(item => document.getElementById(item))

let abortController = new AbortController()
start.addEventListener('click', async function() {
  let item = ''
  try {
    item = localStorage.getItem('item')
  } catch (error) {
    localStorage.setItem('item', '0') // localstorage usado para não repetir cards ao reiniciar a chamada ao server
    item = '0'
  }
  if (counter) counter = 0
  console.log('item: ', item)
  console.log('counter: ', counter)
  const readable = await consumeAPI(abortController.signal)
  readable.pipeTo(appendToHTML(cards, item))
})
stop.addEventListener('click', async function() {
  abortController.abort()
  localStorage.setItem('item', String(counter))
  console.log('aborting...')
  abortController = new AbortController()
})

