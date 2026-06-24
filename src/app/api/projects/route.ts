/**
 * /api/projects — admin registra um projeto recebedor (UFVK sealed-box) e o sistema
 * deriva os endereços mensais; GET lista os projetos. Rota protegida (área admin).
 */

import {
  createProject,
  listProjects,
  type CreateProjectInput,
} from "@/lib/projects/project-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, projects: await listProjects() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateProjectInput;
    const result = await createProject(body);
    return Response.json({ ok: true, result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
