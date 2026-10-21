import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Demo Vendors — Utsav",
  description: "Curated demo service partners with estimated price benchmarks.",
};

export default function VendorsPage() {
  return (
    <PagePlaceholder
      badge="Demo Vendor Directory"
      title="Service Providers & Estimates"
      description="Compare demo caterers, decorators, photographers, and mehendi artists. Price brackets are estimated prices, and all vendor profiles represent demo vendors."
      actionHref="/ideas"
      actionLabel="AI Idea Sparks"
    />
  );
}
