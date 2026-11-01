"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, FileUp, FileText, Trash2 } from "lucide-react";
import {
  deleteSavedPlan,
  readSavedPlans,
  saveNewPlan,
  type SavedPlan,
} from "@/lib/storage/plan-library";
import { createPlanPdf, importPlanPdf } from "@/lib/engine/plan-pdf";
import { CelebrationVisual } from "@/components/celebration-visual";
import { GenerateAiLink } from "@/components/generate-ai-button";

const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

function safeFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w -]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 60);
  return `${slug || "utsav-plan"}.pdf`;
}

export function SavedPlanLibrary() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busyPlanId, setBusyPlanId] = useState("");
  const [importing, setImporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef("");

  /* eslint-disable react-hooks/set-state-in-effect -- Read local storage only after hydration. */
  useEffect(() => {
    try {
      setPlans(readSavedPlans());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Saved plans could not be read.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function showPreview(bytes: Uint8Array, name: string) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const pdfBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(pdfBuffer).set(bytes);
    const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewName(name);
  }

  async function exportPdf(savedPlan: SavedPlan) {
    setBusyPlanId(savedPlan.id);
    setError("");
    setStatus("");
    try {
      const bytes = await createPlanPdf(savedPlan.plan);
      const name = safeFileName(savedPlan.plan.event.title);
      showPreview(bytes, name);
      setStatus(`PDF ready for ${savedPlan.plan.event.title}. Review it below or download it.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The plan PDF could not be created.");
    } finally {
      setBusyPlanId("");
    }
  }

  async function importPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImporting(true);
    setError("");
    setStatus("");
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error("PDF files must be 20 MB or smaller.");
      }
      const plan = await importPlanPdf(new Uint8Array(await file.arrayBuffer()));
      const imported = saveNewPlan(plan);
      setPlans(readSavedPlans());
      setStatus(
        `Imported "${imported.plan.event.title}". The Utsav transfer check, file format, and plan data were validated; the PDF's origin is not cryptographically verified.`,
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PDF plan could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  function removePlan(savedPlan: SavedPlan) {
    if (!window.confirm(`Delete "${savedPlan.plan.event.title}" from this device? This cannot be undone.`)) return;
    try {
      const result = deleteSavedPlan(savedPlan.id);
      setPlans(result.plans);
      setError("");
      setStatus(`Deleted "${savedPlan.plan.event.title}".`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The plan could not be deleted.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <header className="mb-6 grid items-center gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl font-semibold">Plans on this device</h1>
            <p className="mt-1 text-sm text-muted-foreground">Saved locally in this browser. Select a plan to open its full dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GenerateAiLink href="/#plan-prompt">
              Generate plan with AI
            </GenerateAiLink>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => void importPdf(event)}
              className="sr-only"
              aria-label="Choose a Utsav plan PDF to import"
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInput.current?.click()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary disabled:opacity-60"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {importing ? "Importing…" : "Import PDF"}
            </button>
          </div>
        </div>
        <CelebrationVisual city={plans[0]?.plan.event.city ?? "Jaipur"} scene="entrance" title="All your celebrations, together" caption="Your plans stay saved in this browser, ready when you are." />
        </header>
        <p className="mb-4 text-xs text-muted-foreground">
          Imported PDFs are checked against the Utsav transfer line and validated plan data. This does not cryptographically prove who created a PDF.
        </p>
        {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
        {status && <p className="mb-4 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm" role="status">{status}</p>}

        {plans.length > 0 ? (
          <ul className="space-y-2">
            {plans.map((savedPlan) => (
              <li key={savedPlan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <Link
                  href={`/dashboard?planId=${encodeURIComponent(savedPlan.id)}`}
                  className="min-w-0 flex-1 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="block truncate font-medium">{savedPlan.plan.event.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{savedPlan.plan.event.city} · {savedPlan.plan.event.date} · {savedPlan.plan.event.guests.toLocaleString("en-IN")} guests</span>
                  <span className="mt-1 block text-xs font-medium text-primary">Open full dashboard →</span>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void exportPdf(savedPlan)}
                    disabled={Boolean(busyPlanId) || importing}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    {busyPlanId === savedPlan.id ? "Creating…" : "Export PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlan(savedPlan)}
                    aria-label={`Delete ${savedPlan.plan.event.title}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No saved plans on this device yet. Create a plan or import a Utsav PDF.
          </p>
        )}

        {previewUrl && (
          <section className="mt-6" aria-label="Plan PDF preview">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-semibold">PDF preview</h2>
              <a
                href={previewUrl}
                download={previewName}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <ArrowDownToLine className="h-4 w-4" aria-hidden="true" /> Download PDF
              </a>
            </div>
            <iframe
              src={previewUrl}
              title={`PDF preview: ${previewName}`}
              className="h-[75vh] min-h-[480px] w-full rounded-xl border border-border bg-white"
            />
          </section>
        )}
      </section>
    </div>
  );
}
