# Smart Enrollment Forecast

A planning app for superintendents, principals, board members, and district planners. It turns enrollment history, births, housing, and school capacity into a plain-language forecast for the next 1, 3, and 5 years.

The district on screen, Ashford Public Schools, is fictional. The records are complete enough to practice the decisions a board actually makes: where to add teachers, which buildings are crowded, which ones are emptying, whether a boundary change is large enough to matter, and whether a bus route needs another vehicle. A live district would load the same kinds of records from its student information system, the state department of education, birth and census files, and the local planning department.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server listens on the local network as well, so a phone on the same network can open the address Vite prints.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Check TypeScript without writing files |
| `npm run build` | Typecheck, then write a production build to `dist/` |
| `npm run preview` | Serve the production build locally |

## What each page shows

- **Briefing.** District enrollment for the selected fall, the slower-to-faster range, crowded seats, teacher demand, and the few decisions that matter first.
- **Schools.** Every building against program capacity, with grade detail for the school you select.
- **Grades.** Which elementary schools are growing or shrinking, and how each grade changes.
- **Neighborhoods.** Where elementary students live, births, and the housing projects that feed each area.
- **Decisions.** Staffing cost, building pressure, boundary sketches, a consolidation check, and bus estimates.
- **Ask about this forecast.** Answers are drawn from the numbers on screen. They name the fall year you selected.

The year buttons are Fall 2027, Fall 2029, and Fall 2031, counted from the Fall 2026 census. Expected, Slower, and Faster change how quickly new homes fill, how many students stay for the next grade, and how many kindergartners come from local births.

## How a number is produced

The forecast is a cohort-survival model. It is meant to be explained in a board meeting.

- Each grade moves up one year using that school’s recent pattern of students who stay, transfer, or leave.
- Kindergarten comes from births five years earlier, times the share of those children who enroll in the district.
- New homes add students only in the year those homes are occupied, using rates for houses, townhomes, apartments, and age-restricted homes. Those students then age forward with the rest of the class.
- Slower and Faster scale housing, progression, and kindergarten capture so the range is visible next to the expected count.
- Teacher need uses a students-per-teacher target: 22 in elementary, 24 in middle, and 26 in high school. The cost figure uses $82,000 salary and benefits as a planning estimate.
- A bus estimate uses a 62 percent ride rate and 46 students per bus.

## Project layout

```text
src/
  main.tsx                 App entry
  app/                     Screen shell and the error boundary
  pages/                   Briefing, schools, grades, neighborhoods, decisions
  components/              Forecast guide, charts, loading and error screens
  model/                   District records, forecast math, and written insights
  lib/                     Form checks and the saved session
  styles/                  Global styles and the screen layout
legacy/smartspend/         Earlier static files. The forecast app does not load them.
```

`src/model/district.ts` holds the sample schools, births, housing, and capacities. `src/model/forecast.ts` rolls those records forward. `src/model/insights.ts` turns the result into the sentences on each page.

## What is saved on this device

Choices are stored in the browser under `smart-enrollment-forecast.session.v1`: the year, pace, page, school filters, neighborhood, draft question, and the last five answers. Refreshing returns to that same view. If the saved data cannot be read, the app says so and opens the standard forecast. **Start over** on an error screen clears that storage and reloads.

Questions must contain a few words. The school search accepts letters, numbers, spaces, and hyphens, and an invalid search does not hide the school list.

## What this app does not do

It does not connect to a student information system, a state data portal, or a census API. It does not call a language model. Every sentence is written from the forecast calculated in the browser.
