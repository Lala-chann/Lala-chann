
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const INPUT = "data/github.json";
const OUTPUT = "images/week-by-week.gif";

const WIDTH = 760;
const HEIGHT = 350;
const FRAME_COUNT = 36;
const FRAME_DELAY = 110;

const COLORS = {
  background: "#0d1117",
  text: "#f0f6fc",
  muted: "#8b949e",
  line: "#58a6ff",
  empty: "#161b22",
  levels: {
    NONE: "#161b22",
    FIRST_QUARTILE: "#0e4429",
    SECOND_QUARTILE: "#006d32",
    THIRD_QUARTILE: "#26a641",
    FOURTH_QUARTILE: "#39d353"
  }
};

const clamp = (value) => Math.max(0, Math.min(1, value));

const easeOut = (value) => {
  const x = clamp(value);
  return 1 - Math.pow(1 - x, 3);
};

function getWeekData(calendar) {
  return calendar.weeks.map((week) => {
    const days = week.contributionDays;

    return {
      days,
      total: days.reduce(
        (sum, day) => sum + day.contributionCount,
        0
      )
    };
  });
}

function renderFrame(calendar, weeks, progress) {
  const margin = 42;
  const chartTop = 90;
  const chartBottom = 190;
  const gridTop = 235;
  const cell = 9;
  const gap = 3;
  const columnWidth = cell + gap;

  const maxWeekly = Math.max(
    1,
    ...weeks.map((week) => week.total)
  );

  const chartPoints = weeks.map((week, index) => {
    const x = margin + index * columnWidth + cell / 2;

    const y =
      chartBottom -
      (week.total / maxWeekly) * (chartBottom - chartTop);

    return { x, y };
  });

  const lineProgress = clamp(progress / 0.42);
  const gridProgress = clamp((progress - 0.35) / 0.65);

  const visiblePoint = Math.min(
    weeks.length - 1,
    Math.floor(lineProgress * (weeks.length - 1))
  );

  const linePath = chartPoints
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${WIDTH}" height="${HEIGHT}"
      viewBox="0 0 ${WIDTH} ${HEIGHT}">

      <rect width="100%" height="100%"
        fill="${COLORS.background}"/>

      <text x="${margin}" y="35"
        fill="${COLORS.text}"
        font-size="21"
        font-family="Arial, sans-serif"
        font-weight="bold">
        Week by week
      </text>

      <text x="${WIDTH - margin}" y="35"
        fill="${COLORS.muted}"
        font-size="13"
        font-family="Arial, sans-serif"
        text-anchor="end">
        ${calendar.totalContributions.toLocaleString()} contributions
      </text>

      <path d="${linePath}"
        fill="none"
        stroke="${COLORS.line}"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="1000"
        stroke-dasharray="${lineProgress * 1000} 1000"
        opacity="0.9"/>
  `;

  const active = chartPoints[visiblePoint];

  svg += `
    <circle cx="${active.x}" cy="${active.y}"
      r="5"
      fill="${COLORS.line}"
      stroke="${COLORS.background}"
      stroke-width="2"/>
  `;

  weeks.forEach((week, weekIndex) => {
    const point = chartPoints[weekIndex];

    const weekProgress = clamp(
      gridProgress * weeks.length - weekIndex
    );

    const eased = easeOut(weekProgress);

    week.days.forEach((day, dayIndex) => {
      const x = margin + weekIndex * columnWidth;
      const targetY = gridTop + dayIndex * columnWidth;

      const y =
        point.y + (targetY - point.y) * eased;

      const color =
        COLORS.levels[day.contributionLevel] ||
        COLORS.empty;

      const opacity = weekProgress > 0 ? 1 : 0;

      svg += `
        <rect
          x="${x}"
          y="${y.toFixed(2)}"
          width="${cell}"
          height="${cell}"
          rx="2"
          fill="${color}"
          opacity="${opacity}"
        />
      `;
    });
  });

  svg += `
      <text x="${margin}" y="${HEIGHT - 18}"
        fill="${COLORS.muted}"
        font-size="11"
        font-family="Arial, sans-serif">
        Last 53 weeks · Sunday to Saturday
      </text>

    </svg>
  `;

  return svg;
}

async function main() {
  const raw = await fs.readFile(INPUT, "utf8");
  const calendar = JSON.parse(raw);

  if (!calendar.weeks || calendar.weeks.length === 0) {
    throw new Error("No contribution weeks found.");
  }

  const weeks = getWeekData(calendar);

  await fs.mkdir(path.dirname(OUTPUT), {
    recursive: true
  });

  // Use the completed frame to create one shared GIF palette.
  const finalSvg = renderFrame(calendar, weeks, 1);

  const finalImage = await sharp(Buffer.from(finalSvg))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const palette = quantize(finalImage.data, 256);

  const gif = GIFEncoder();

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const progress = frame / (FRAME_COUNT - 1);

    const svg = renderFrame(calendar, weeks, progress);

    const image = await sharp(Buffer.from(svg))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const indexed = applyPalette(image.data, palette);

    gif.writeFrame(
      indexed,
      WIDTH,
      HEIGHT,
      frame === 0
        ? {
            palette,
            delay: FRAME_DELAY,
            repeat: 0
          }
        : {
            delay: FRAME_DELAY
          }
    );
  }

  gif.finish();

  await fs.writeFile(
    OUTPUT,
    Buffer.from(gif.bytes())
  );

  console.log("Week by week animation created!");
  console.log("Total contributions:", calendar.totalContributions);
  console.log("Weeks:", weeks.length);
  console.log("Output:", OUTPUT);
}

main().catch((error) => {
  console.error("Animation generation failed:", error);
  process.exit(1);
});
