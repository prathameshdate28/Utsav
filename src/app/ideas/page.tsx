import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "AI Ideas & Themes — Utsav",
  description: "AI-generated celebration concepts validated with strict schemas.",
};

export default function IdeasPage() {
  return (
    <PagePlaceholder
      badge="Curated AI Sparks"
      title="Themes & Celebration Ideas"
      description="Brainstorm eco-friendly decor, nostalgic guest entry concepts, and regional food stalls. Every AI suggestion is schema-validated with cached fallbacks."
      actionHref="/moodboard"
      actionLabel="View Moodboard"
    />
  );
}
