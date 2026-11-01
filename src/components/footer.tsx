/**
 * Global footer highlighting transparency disclaimers:
 * demo vendors, estimated pricing, and cultural variation notes.
 */
export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/40 py-8 px-4 text-center text-xs text-muted-foreground mt-auto">
      <div className="container mx-auto max-w-4xl space-y-2">
        <p className="font-medium text-foreground">
          Utsav · AI Event Co-Planner for Indian Celebrations
        </p>
        <p>
          Disclaimer: All prices shown across the app are estimated prices. All vendors
          listed are demo vendors. Cultural ceremony suggestions reflect practices
          commonly practised; traditions vary by family and community.
        </p>
      </div>
    </footer>
  );
}
