const fetch = require('node-fetch')
const fs = require('fs')
const PDFDocument = require('pdfkit')
const https = require('https')

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
})

require('dotenv').config()

const token = process.env.TOKEN || console.error('Please provide API token in .env') || process.exit(1)

const progress = require('./progress')
const inquirer = require('inquirer')

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

    const bar = new progress('trang')
    console.log(`Đang tải ${data.className}/${data.name}`)
    bar.start(data.totalPage, 1)

    const doc = new PDFDocument({ autoFirstPage: false })
    if (!fs.existsSync(`books/${data.className}`)) fs.mkdirSync(`books/${data.className}`)
    doc.pipe(fs.createWriteStream(`books/${data.className}/${data.name}.pdf`))

    for (let i = 1; i < data.totalPage; i++) {
        const buffer = await (
            await fetch('https://cdnelearning.nxbgd.vn/uploads/books/' + data.fileName + `-${i}.jpg`, {
                agent: httpsAgent
            })
        ).buffer()
        const img = doc.openImage(buffer)
        doc.addPage({ size: [img.width, img.height] })
        doc.image(img, 0, 0)
        bar.increase(1)
    }

    doc.end()
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
            console.error(`Không thể tải ${book}`)
        }
        console.log('')
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

if (!fs.existsSync('books')) fs.mkdirSync('books')
getClasses()