import { redirect } from "next/navigation";
import { RoleComposer } from "@/components/recruiter/role-composer";
import { currentViewer } from "@/server/session";

export const metadata = { title: "New role" };

export default async function NewRolePage() {
  const viewer = await currentViewer();
  if (viewer?.role !== "recruiter") redirect("/jobs");
  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <h1 className="poster text-5xl sm:text-6xl">Who are you hiring?</h1>
      <p className="mt-1 max-w-xl text-muted-foreground">
        Paste a job description or describe the role in a sentence. We structure it, then you swipe on candidates who fit.
      </p>
      <div className="mt-8">
        <RoleComposer />
      </div>
    </div>
  );
}
