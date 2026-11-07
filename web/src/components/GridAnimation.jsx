
import githubData from '../../../data/github.json'
import './GridAnimation.css'
import { useState } from 'react'

function GridAnimation() {
  const weeks = githubData.weeks
  const [hoveredDay, setHoveredDay] = useState(null)

  const weekdays = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  function getContributionColor(count) {
    if (count === 0) return '#161b22'
    if (count <= 3) return '#0e4429'
    if (count <= 6) return '#006d32'
    if (count <= 10) return '#26a641'
    return '#39d353'
  }

  function getMonthLabel(week, index) {
    const firstDay = week.contributionDays[0]
    const month = firstDay.date.slice(5, 7)

    const previousMonth =
      index > 0
        ? weeks[index - 1].contributionDays[0].date.slice(5, 7)
        : null

    if (month !== previousMonth) {
      return new Date(`${firstDay.date}T00:00:00`).toLocaleString(
        'en-US',
        { month: 'short', timeZone: 'UTC' }
      )
    }

    return ''
  }

  return (
    <div className="contribution-container">
      <div className="contribution-header">
        <h2>GitHub Contribution Grid</h2>
        <p>Total Contributions: {githubData.totalContributions}</p>
      </div>

      <div className="calendar">
        <div className="weekday-labels">
          {weekdays.map((day, index) => (
            <div key={index}>{day}</div>
          ))}
        </div>

        <div className="calendar-content">
          <div className="month-labels">
            {weeks.map((week, index) => (
              <div className="month-label" key={index}>
                {getMonthLabel(week, index)}
              </div>
            ))}
          </div>

          <div className="contribution-grid">
            {weeks.map((week, index) => (
              <div
                className="contribution-week"
                key={index}
                style={{
                  animationDelay: `${index * 0.08}s`
                }}
              >
                {week.contributionDays.map((day) => (
                  <div
                    key={day.date}
                    className="contribution-day"
                    style={{
                      backgroundColor: getContributionColor(
                        day.contributionCount
                      )
                    }}
                    title={`${day.date}: ${day.contributionCount} contributions`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GridAnimation
