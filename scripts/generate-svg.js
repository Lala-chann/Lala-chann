
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, '..')

const data = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data/github.json'), 'utf8')
)

const weeks = data.weeks
const cellSize = 11
const gap = 3
const step = cellSize + gap

const colors = {
  0: '#161b22',
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353'
}

function getLevel(count) {
  if (count === 0) return 0
  if (count <= 3) return 1
  if (count <= 6) return 2
  if (count <= 10) return 3
  return 4
}

const monthLabels = []
let previousMonth = ''

weeks.forEach((week, index) => {
  const date = week.contributionDays[0].date
  const month = date.slice(0, 7)

  if (month !== previousMonth) {
    const label = new Date(`${date}T00:00:00Z`)
      .toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC'
      })

    monthLabels.push({
      label,
      x: index * step
    })

    previousMonth = month
  }
})

const width = weeks.length * step - gap + 10
const height = 7 * step + 35

const rectangles = weeks.map((week, weekIndex) => {
  return week.contributionDays.map((day) => {
    const level = getLevel(day.contributionCount)
    const x = weekIndex * step
    const y = day.weekday * step

    return `
      <rect
        x="${x}"
        y="${y + 25}"
        width="${cellSize}"
        height="${cellSize}"
        rx="2"
        fill="${colors[level]}"
      >
        <title>${day.date}: ${day.contributionCount} contributions</title>
      </rect>
    `
  }).join('')
}).join('')

const labels = monthLabels.map(({ label, x }) => `
  <text
    x="${x}"
    y="12"
    fill="#8b949e"
    font-size="10"
    font-family="Arial, sans-serif"
  >${label}</text>
`).join('')

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <rect width="100%" height="100%" fill="#0d1117" rx="6"/>
  ${labels}
  ${rectangles}
</svg>
`

const outputDir = path.join(rootDir, 'images')
fs.mkdirSync(outputDir, { recursive: true })

fs.writeFileSync(
  path.join(outputDir, 'contribution-grid.svg'),
  svg.trim()
)

console.log('Contribution SVG generated successfully!')
