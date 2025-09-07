import React from "react";
import VideoEmbed from "../ui/VideoEmbed";

export default function WhyNoAmountPage() {
  return (
    <div className="px-4 md:px-8 space-y-8">
      <h1 className="text-3xl font-extrabold mb-4">Why No Amount of Money is Enough</h1>
      <VideoEmbed
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        title="Why no amount of money is enough"
      />
      <VideoEmbed
        src="https://www.youtube.com/embed/3GwjfUFyY6M"
        title="Short explanation"
      />
    </div>
  );
}
