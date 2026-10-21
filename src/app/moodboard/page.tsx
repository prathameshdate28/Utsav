import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Moodboard — Utsav",
  description: "Visual inspiration board and colour palettes for your celebration.",
};

export default function MoodboardPage() {
  return (
    <PagePlaceholder
      badge="Visual Inspiration"
      title="Aesthetic Moodboard"
      description="Assemble your event visual language: marigold yellows, royal emeralds, terracotta drapes, and ambient brass lanterns."
      actionHref="/panic"
      actionLabel="Review Emergency Playbook"
    />
  );
}
