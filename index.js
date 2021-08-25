const fetch = require('node-fetch')
const https = require('https')
const Stream = require('stream').Transform
const fs = require('fs')

require('dotenv').config()
const token = process.env.TOKEN

const cliProgress = require('cli-progress')
const inquirer = require('inquirer')

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

function download(url, filename) {
    return new Promise(resolve => {
        try {
            https
                .request(url, response => {
                    var data = new Stream()

                    response.on('data', function (chunk) {
                        data.push(chunk)
                    })

                    response.on('end', function () {
                        fs.writeFileSync(filename, data.read())
                        resolve(true)
                    })
                })
                .end()
        } catch {
            resolve(false)
        }
    })
}

async function getPages(bookID) {
    const res = await fetch(`https://apihanhtrangso.nxbgd.vn/api/book/${bookID}`, {
        headers: {
            accept: 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            authorization: `Bearer ${token}`,
            cache: 'no-cache',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'sec-gpc': '1',
            'x-requested-with': 'XMLHttpRequest'
        },
        referrer: 'https://hanhtrangso.nxbgd.vn/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: null,
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    })
    const { data } = await res.json()

    if (!fs.existsSync('books/' + data.slug)) fs.mkdirSync('books/' + data.slug)

    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
    console.log(`Đang tải ${data.name}`)
    bar.start(data.totalPage, 1)

    for (let i = 1; i < data.totalPage; i++) {
        const result = await download(
            'https://cdnelearning.nxbgd.vn/uploads/books/' + data.fileName + `-${i}.jpg`,
            `books/${data.slug}/${i}.png`
        )
        bar.increment(1)
        if (!result) {
            console.error('Download failed!')
            break
        }
    }
    bar.stop()
}

async function getBooks(classList) {
    const res = await fetch('https://apihanhtrangso.nxbgd.vn/api/book/book-list', {
        headers: {
            accept: 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            authorization: `Bearer ${token}`,
            cache: 'no-cache',
            'content-type': 'application/json',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'sec-gpc': '1',
            'x-requested-with': 'XMLHttpRequest'
        },
        referrer: 'https://hanhtrangso.nxbgd.vn/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: `{"classes":[${classList}]}`,
        method: 'POST',
        mode: 'cors',
        credentials: 'include'
    })
    const { data } = await res.json()

    const bookMap = {}

    data[0].bookGroups[0].books.forEach(book => (bookMap[book.name] = book.bookId))

    const ans = await inquirer.prompt([
        {
            type: 'checkbox',
            message: 'Chọn sách để tải',
            name: 'book',
            choices: Array.from(data[0].bookGroups[0].books, book => book.name)
        }
    ])

    for (const book of ans.book) {
        try {
            await getPages(bookMap[book])
        } catch {
            console.error(`Không thể tải ${book.name}`)
        }
    }
}

async function getClasses() {
    const res = await fetch('https://apihanhtrangso.nxbgd.vn/api/book/BookFillter', {
        headers: {
            accept: 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            authorization: `Bearer ${token}`,
            cache: 'no-cache',
            'content-type': 'application/json',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'sec-gpc': '1',
            'x-requested-with': 'XMLHttpRequest'
        },
        referrer: 'https://hanhtrangso.nxbgd.vn/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: '{}',
        method: 'POST',
        mode: 'cors',
        credentials: 'include'
    })
    const { data } = await res.json()

    const classMap = {}

    data.classes.forEach(x => (classMap[x.name] = x.classId))

    const ans = await inquirer.prompt([
        {
            type: 'checkbox',
            message: 'Chọn lớp',
            name: 'class',
            choices: Array.from(data.classes, x => x.name)
        }
    ])

    getBooks(Array.from(ans.class, x => classMap[x]))
}

getClasses()