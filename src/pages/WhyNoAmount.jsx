import React from "react";
import VideoEmbed from "../ui/VideoEmbed";

export default function WhyNoAmount() {
  return (
    <main className="px-4 md:px-8 space-y-8">
      <h1 className="text-3xl font-extrabold mb-4">Why No Amount of Money Is Enough</h1>
      <VideoEmbed
        src="https://www.youtube.com/embed/GDn1lxY_qaI"
        title="The Heist: What Happens to the Money in a $100 Billion Industry"
      />
      <VideoEmbed
        src="https://www.youtube.com/embed/VPpG5u2yeEo"
        title="The Profiteers: The People Who Steer Money Out of the Classroom"
      />
    </main>
  );
}
