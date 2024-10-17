import http from 'node:http'

const users = []

const server = http.createServer((req, res) => {
    res.write('i am here')
    res.write('dodododod')
})

server.listen(3000, '127.0.0.1', () => {
    console.log('У аппарата')
})

console.log('lalal')
console.log('lalal')
