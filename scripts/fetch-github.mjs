
const GITHUB_USERNAME = "Lala-chann";
const GITHUB_TOKEN = process.env.GH_PAT;

const query = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }
`;

async function main() {
  if (!GITHUB_TOKEN) {
    throw new Error("GH_PAT token is missing");
  }

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 371);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables: {
        username: GITHUB_USERNAME,
        from: from.toISOString(),
        to: to.toISOString()
      }
    })
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new Error(JSON.stringify(result.errors || result));
  }

  const calendar = result.data.user.contributionsCollection
    .contributionCalendar;

  const fs = await import("node:fs/promises");

  await fs.mkdir("data", { recursive: true });

  await fs.writeFile(
    "data/github.json",
    JSON.stringify(calendar, null, 2)
  );

  console.log("Contribution data saved successfully!");
  console.log("Total contributions:", calendar.totalContributions);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
