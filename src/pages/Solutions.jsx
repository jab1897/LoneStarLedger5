import React from "react";

const sections = [
  {
    title: "Modify the Accountability Ratings to Prioritize Student Performance",
    paragraphs: [
      "Dallas ISD is a prime example of the misalignment between TEA’s Accountability Grade and the performance of its students. Although a majority of their students are not performing at grade level, the district received an accountability score of 83 and a letter grade of B.",
      "Our current A-F rating system does not prioritize student performance in a way that most parents and educators would expect.",
    ],
  },
  {
    title: "Simplify the School Funding Formula",
    paragraphs: [
      "Our school finance formula is complicated and over-engineered. It is said that only a handful of professionals in Texas truly understand its complexity. This complexity has only harmed parents and educators, while benefiting the consulting class, by making a $100 billion system dependent on a handful of experts.",
      "Every parent, teacher, and school administrator should be able to understand and predict the resources their district will receive each year.",
    ],
  },
  {
    title: "Prioritize Classroom Funding",
    paragraphs: [
      "Roscoe ISD is illustrative of this fact. The district spends over $100 million per year, but only $4.3 million is spent on teacher compensation, and $61 million is spent on a single online vendor.",
      "Only about 34% of the nearly $100 billion spent on education yearly ends up going directly into the classroom. While the rest is siphoned away to pay for contract professionals, lobbyists, architects, and construction.",
      "Cap administrative overhead and direct the majority of new revenue to teacher pay, instructional materials, and student services.",
    ],
  },
  {
    title: "Require a Price-Based Competitive Bidding Process for School Contracts",
    paragraphs: [
      "An overwhelming majority of Texas School Boards award contracts, often reaching a total value in the millions, to vendors not based on price (as most businesses would consider) but based on whether these businesses are on the preferred vendor list curated by the Texas Association of School Boards.",
    ],
  },
  {
    title: "Audit School Contracts",
    paragraphs: [
      "Require districts to publish all vendor contracts and spending details in a searchable database. Transparency discourages waste and allows taxpayers to see where funds are going.",
    ],
  },
  {
    title: "Reform the Bond Process",
    paragraphs: [
      "The vast majority of new bonds are passed through small turnout elections comprised of fewer than a few hundred voters. These bonds are then burdened by millions of taxpayers across the school district’s boundary.",
      "All new bonds should be passed with a two-thirds vote and be held in November.",
    ],
  },
  {
    title: "End Pay-to-Play in Bond Elections",
    paragraphs: [
      "School bonds are a big business in the construction space. By contributing only a few thousand dollars to pass a multi-million dollar bond, construction companies are benefiting by supporting the bonds that will pay for their business services.",
      "Below is a chart showing the contributions and payouts several vendors contributed to for one of Northside ISD’s bonds.",
    ],
  },
  {
    title: "End Taxpayer Funded Lobbying",
    paragraphs: [
      "Districts such as Austin ISD, Dallas ISD, and Garland ISD spend millions per year on taxpayer-funded lobbyists and consultants.",
      "These vendors are paid to keep school district finances opaque and to allow districts to keep raising your property taxes through new bonds.",
    ],
  },
];

export default function Solutions() {
  return (
    <main className="mx-auto max-w-3xl">
      <article className="section-card editorial-article space-y-4">
        <header>
          <span className="eyebrow eyebrow--brand">Editorial · Policy</span>
          <h1>Solutions</h1>
          <p className="dek">
            Eight specific reforms that would make Texas K–12 finance more
            transparent, accountable, and focused on students.
          </p>
        </header>

        {sections.map(({ title, paragraphs }, i) => (
          <section key={title} className="space-y-2">
            <h2>
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  color: "var(--mesquite-600)",
                  marginRight: "0.5rem",
                  fontWeight: 500,
                }}
              >
                {String(i + 1).padStart(2, "0")}.
              </span>
              {title}
            </h2>
            {paragraphs.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
