function ProgressBar(unit = '') {
    this.unit = unit

    this.bar = () => {
        const width = 40
        const progress = this.value / this.maxValue
        const whole = ~~(progress * width)
        const rem = (progress * width) % 1
        const part = ~~(rem * 8)
        let partChar = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉'][part]
        if (width - whole - 1 < 0) partChar = ''
        return '[' + '█'.repeat(whole) + partChar + (partChar && ' '.repeat(width - whole - 1)) + ']'
    }

    this.print = () => {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        const percent = ~~((100 * this.value) / this.maxValue)
        const elapsed = (Date.now() - this.startTime) / 1000
        const remaining = Math.ceil((elapsed / this.value) * (this.maxValue - this.value))
        process.stdout.write(`${this.bar()} ${percent}% | ETA: ${remaining}s`)
        if (this.unit) {
            const speed = ~~(this.value / elapsed)
            process.stdout.write(` | ${speed} ${this.unit}/s`)
        }
    }

    this.start = (max = 100, start = 0) => {
        this.interval = setInterval(this.print, 1000)
        this.value = start
        this.maxValue = max
        this.startTime = Date.now()
        this.print()
    }

    this.update = value => {
        this.value = value
        this.print()
    }

    this.increase = delta => {
        this.value += delta
        this.value = Math.max(this.value, 0)
        if (this.value >= this.maxValue) this.done()
        else this.print()
    }

    this.done = () => {
        clearInterval(this.interval)
        this.value = this.maxValue
        this.print()
        process.stdout.write('\n')
    }
}

module.exports = ProgressBar
