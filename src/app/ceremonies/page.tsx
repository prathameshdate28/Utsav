import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Ceremonies & Traditions — Utsav",
  description: "Cultural guides and ritual sequence checklists across India.",
};

export default function CeremoniesPage() {
  return (
    <PagePlaceholder
      badge="Cultural Heritage"
      title="Ceremonies & Ritual Guides"
      description="Step-by-step guides for Haldi, Sangeet, Phere, Satyanarayan Puja, or milestone 50th/60th birthdays. Commonly practised; traditions vary by family."
      actionHref="/moodboard"
      actionLabel="Create Moodboard"
    />
  );
}
