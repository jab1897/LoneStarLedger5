// src/pages/About.jsx
import React from "react";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl">
      <article className="section-card editorial-article space-y-5">
        <header>
          <span className="eyebrow eyebrow--brand">About</span>
          <h1>About LoneStar Ledger</h1>
          <p className="dek">
            Making Texas K–12 finance and operations easy to understand —
            districts, campuses, vendors, and line items in one place.
          </p>
        </header>

        <p>
          We bring public data together so families, educators, reporters, and
          lawmakers can see where dollars go and what students receive.
        </p>

        <h2>What you can do here</h2>
        <p>
          Search any district or campus, review spending and staffing, look at
          performance, and compare peers across time. Each profile shows
          high-level indicators with links to deeper detail so you can verify
          what you see.
        </p>

        <h2>Where our data comes from</h2>
        <p>All information on this site comes from public sources published by the State of Texas.</p>
        <ul className="list-disc pl-6 space-y-3">
          <li>
            <strong>Spending:</strong> PEIMS Financial Actuals from the Texas Education Agency
            <br />
            <a
              href="https://tea.texas.gov/finance-and-grants/state-funding/state-funding-reports-and-data/peims-access-database-financial-data-downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="break-words"
            >
              tea.texas.gov/finance-and-grants/…/peims-access-database-financial-data-downloads
            </a>
          </li>
          <li>
            <strong>School and district performance:</strong> TXschools.gov Accountability reports
            <br />
            <a
              href="https://txschools.gov/?lng=en"
              target="_blank"
              rel="noopener noreferrer"
              className="break-words"
            >
              txschools.gov
            </a>
          </li>
          <li>
            <strong>District debt:</strong> Texas Bond Review Board Debt Search
            <br />
            <a
              href="https://debtsearch.brb.texas.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="break-words"
            >
              debtsearch.brb.texas.gov
            </a>
          </li>
          <li>
            <strong>Grade-level performance:</strong> Texas Academic Performance Reports
            <br />
            <a
              href="https://rptsvr1.tea.texas.gov/perfreport/tapr/2024/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="break-words"
            >
              rptsvr1.tea.texas.gov/perfreport/tapr/2024
            </a>
          </li>
          <li>
            <strong>Staff and salary:</strong> PEIMS Standard Reports
            <br />
            <a
              href="https://tea.texas.gov/reports-and-data/student-data/standard-reports/peims-standard-reports"
              target="_blank"
              rel="noopener noreferrer"
              className="break-words"
            >
              tea.texas.gov/…/peims-standard-reports
            </a>
          </li>
        </ul>

        <h2>How we handle the data</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>We retrieve source files exactly as released by each agency and keep them in their original form for audit and replication.</li>
          <li>Calculations such as per-pupil figures use student counts from the same school year shown on a profile. When a different count is required, the page will note it.</li>
          <li>Some values may be rounded. Small rounding differences can cause a minor variance between category totals and grand totals.</li>
          <li>When agencies revise files, we aim to refresh the site soon after those revisions post. A "Last updated" date appears on profiles when available.</li>
        </ul>

        <h2>Coverage and caveats</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>The site reflects what the agencies publish. If a source suppresses small counts for privacy or applies business rules, those same limits will appear here.</li>
          <li>Historical trends can be affected by accounting changes or district boundary changes. We note these cases when they are material.</li>
          <li>LoneStar Ledger is an independent project. It is not affiliated with TEA, TXschools.gov, or the Bond Review Board. Any errors are ours.</li>
        </ul>

        <h2>Privacy</h2>
        <p>
          We do not publish student-level information. All data are aggregated
          and come from public releases. Any analytics we use are for improving
          the site experience and do not sell or share personal information.
        </p>

        <h2>Feedback or corrections</h2>
        <p>
          If you spot an error, have a question, or want to request a feature,
          please email{" "}
          <a href="mailto:communications@texaspolicy.com">
            communications@texaspolicy.com
          </a>
          . Include the district or campus name, the page link, and a short note
          about what you believe needs review.
        </p>
      </article>
    </main>
  );
}
