import React from "react";

export default function Solutions() {
  const items = [
    {
      title: "Audit School Contracts",
      description:
        "Require districts to publish all vendor contracts and spending details in a searchable database. Transparency discourages waste and allows taxpayers to see where funds are going.",
    },
    {
      title: "Prioritize Classroom Funding",
      description:
        "Cap administrative overhead and direct the majority of new revenue to teacher pay, instructional materials, and student services.",
    },
    {
      title: "Empower Local Decision-Making",
      description:
        "Give campuses flexibility to adopt cost-effective tools and programs while holding them accountable for results.",
    },
  ];

  return (
    <div className="bg-white border rounded-2xl p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Solutions</h1>
      <ul className="space-y-6 list-disc pl-6">
        {items.map(({ title, description }) => (
          <li key={title}>
            <p className="font-semibold">{title}</p>
            <p className="text-gray-700">{description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
