import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";
import { getLocale, getT } from "@/i18n/server";
import PostCard from "@/app/risorse/PostCard";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', monospace";

/** Ultimi articoli in home: link interni diretti verso le risorse (anche per l'indicizzazione). */
export default async function LatestPosts() {
  const locale = await getLocale();
  const t = await getT("risorse");
  const posts = getAllPosts(locale).slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section style={{ background: "#fafaf9", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "clamp(56px, 7vw, 88px) 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 400, letterSpacing: "-1.2px", color: "#0D1016", margin: 0 }}>
            {t("latestTitle")}
          </h2>
          <Link href="/risorse" style={{ fontFamily: MONO, fontSize: 12, color: "#0D1016", textDecoration: "none", borderBottom: "1px solid rgba(0,0,0,0.25)", paddingBottom: 2 }}>
            {t("latestAll")}
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {posts.map((post, i) => (
            <PostCard key={post.slug} post={post} isNew={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
