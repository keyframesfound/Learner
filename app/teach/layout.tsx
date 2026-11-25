import Link from "next/link";
import { redirect } from "next/navigation";
import { isStaff, viewer } from "@/lib/repo";

export default async function TeachLayout({ children }: { children: React.ReactNode }) {
  const v = await viewer();
  if (!v) redirect("/login");
  if (!isStaff(v)) redirect("/");

  return (
    <>
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "12px 16px 0",
        }}
      >
        <Link className="btn sm ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/teach/classes">Classes</Link>
        <Link className="btn sm ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/teach/curriculum">Curriculum</Link>
        <Link className="btn sm ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }} href="/">Back to app</Link>
      </nav>
      {children}
    </>
  );
}
