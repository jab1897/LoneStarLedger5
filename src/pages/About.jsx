// src/pages/About.jsx
import React from "react";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4">
      <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 text-slate-800">
        <h1 className="text-2xl font-bold text-slate-900">
          About Open Texas Schools
        </h1>

        <p className="leading-relaxed">
          We make Texas K 12 finance and operations easy to understand. Districts, campuses, vendors, and line items are brought together in one place so families, educators, reporters, and lawmakers can see where dollars go and what students receive.
        </p>

        <h2 className="text-xl font-semibold text-slate-900">
          What you can do here
        </h2>
        <p className="leading-relaxed">
          Search any district or campus, review spending and staffing, look at performance, and compare peers across time. Each profile shows high level indicators with links to deeper detail so you can verify what you see.
        </p>

        <h2 className="text-xl font-semibold text-slate-900">
          Where our data comes from
        </h2>
        <p className="leading-relaxed">
          All information on this site comes from public sources published by the State of Texas.
        </p>
        <ul className="list-disc pl-6 space-y-3">
          <li className="leading-relaxed">
            <strong>Spending:</strong> PEIMS Financial Actuals from the Texas Education Agency
            <br />
            <a
              href="https://tea.texas.gov/finance-and-grants/state-funding/state-funding-reports-and-data/peims-access-database-financial-data-downloads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline break-words"
            >
              https://tea.texas.gov/finance-and-grants/state-funding/state-funding-reports-and-data/peims-access-database-financial-data-downloads
            </a>
          </li>
          <li className="leading-relaxed">
            <strong>School and district performance:</strong> TXschools.gov Accountability reports
            <br />
            <a
              href="https://txschools.gov/?lng=en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline break-words"
            >
              https://txschools.gov/?lng=en
            </a>
          </li>
          <li className="leading-relaxed">
            <strong>District debt:</strong> Texas Bond Review Board Debt Search
            <br />
            <a
              href="https://debtsearch.brb.texas.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline break-words"
            >
              https://debtsearch.brb.texas.gov/
            </a>
          </li>
          <li className="leading-relaxed">
            <strong>Grade level performance:</strong> Texas Academic Performance Reports
            <br />
            <a
              href="https://rptsvr1.tea.texas.gov/perfreport/tapr/2024/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline break-words"
            >
              https://rptsvr1.tea.texas.gov/perfreport/tapr/2024/index.html
            </a>
          </li>
          <li className="leading-relaxed">
            <strong>Staff and salary:</strong> PEIMS Standard Reports
            <br />
            <a
              href="https://tea.texas.gov/reports-and-data/student-data/standard-reports/peims-standard-reports"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline break-words"
            >
              https://tea.texas.gov/reports-and-data/student-data/standard-reports/peims-standard-reports
            </a>
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900">
          How we handle the data
        </h2>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed">
          <li>We retrieve source files exactly as released by each agency and keep them in their original form for audit and replication.</li>
          <li>Calculations such as per pupil figures use student counts from the same school year shown on a profile. When a different count is required, the page will note it.</li>
          <li>Some values may be rounded. Small rounding differences can cause a minor variance between category totals and grand totals.</li>
          <li>When agencies revise files, we aim to refresh the site soon after those revisions post. A Last updated date appears on profiles when available.</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900">
          Coverage and caveats
        </h2>
        <ul className="list-disc pl-6 space-y-2 leading-relaxed">
          <li>The site reflects what the agencies publish. If a source suppresses small counts for privacy or applies business rules, those same limits will appear here.</li>
          <li>Historical trends can be affected by accounting changes or district boundary changes. We note these cases when they are material.</li>
          <li>Open Texas Schools is an independent project. It is not affiliated with TEA, TXschools.gov, or the Bond Review Board. Any errors are ours.</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900">Privacy</h2>
        <p className="leading-relaxed">
          We do not publish student level information. All data are aggregated and come from public releases. Any analytics we use are for improving the site experience and do not sell or share personal information.
        </p>

        <h2 className="text-xl font-semibold text-slate-900">
          Feedback or corrections
        </h2>
        <p className="leading-relaxed">
          If you spot an error, have a question, or want to request a feature, please email{" "}
          <a
            href="mailto:communications@texaspolicy.com"
            className="text-brand-700 underline"
          >
            communications@texaspolicy.com
          </a>
          . Include the district or campus name, the page link, and a short note about what you believe needs review.
        </p>
      </article>
    </main>
  );
}
