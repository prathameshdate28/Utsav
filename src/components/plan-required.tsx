import { GenerateAiLink } from "@/components/generate-ai-button";

export function PlanRequired({ message }: { message: string }) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center">
      <p className="text-muted-foreground">{message}</p>
      <GenerateAiLink href="/#plan-prompt" className="mt-5">
        Generate plan with AI
      </GenerateAiLink>
    </section>
  );
}
