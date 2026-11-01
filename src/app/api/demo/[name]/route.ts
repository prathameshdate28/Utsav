import { readFile } from "node:fs/promises";
import path from "node:path";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import { createFallbackBlueprint } from "@/lib/ai/fallback";

const DEMO_NAMES = new Set(["jaipur-wedding", "pune-birthday", "thane-community"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name } = await params;
  if (!DEMO_NAMES.has(name)) return Response.json({ error: "Demo plan not found." }, { status: 404 });
  try {
    const file = path.join(process.cwd(), "data", "demo", `${name}.json`);
    try {
      const content = await readFile(file, "utf8");
      const plan = blueprintSchema.parse(JSON.parse(content));
      return Response.json({ plan, cached: true });
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      const prompts: Record<string, string> = {
        "jaipur-wedding": "My sister's wedding in Jaipur, 300 guests, ₹25 lakh, February, mix of traditional and modern",
        "pune-birthday": "A 5th birthday for my daughter in Pune, 40 guests, ₹60,000, she loves dinosaurs and butterflies",
        "thane-community": "Society Ganesh Utsav in Thane, 400 residents, ₹2 lakh, eco-friendly",
      };
      return Response.json({ plan: createFallbackBlueprint(prompts[name]), cached: true, fallback: true });
    }
  } catch (error) {
    console.error(`Demo ${name} failed validation:`, error);
    return Response.json({ error: "This demo plan failed validation." }, { status: 500 });
  }
}
