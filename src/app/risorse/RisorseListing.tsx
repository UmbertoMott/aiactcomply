import Link from "next/link";
import Nav from "@/components/Nav";
import BookDemoBanner from "@/components/BookDemoBanner";
import PostCard from "./PostCard";
import { getPostsPage, getTotalPages } from "@/lib/blog/posts";
import { getT, getLocale } from "@/i18n/server";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

/** URL della pagina N della lista Risorse (la 1 è /risorse). */
export function risorsePageHref(page: number): string {
  return page <= 1 ? "/risorse" : `/risorse/pagina/${page}`;
}

/** Lista Risorse paginata: massimo POSTS_PER_PAGE (10) articoli per pagina. */
export default async function RisorseListing({ page }: { page: number }) {
  const locale = await getLocale();
  const posts = getPostsPage(page, locale);
  const totalPages = getTotalPages();
  const t = await getT("risorse");

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0D1016" }}>
      <Nav />

      {/* Hero */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "80px 24px 56px", textAlign: "center" }}>
        <p style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "1.5px",
          textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 20,
        }}>
          {t("kicker")}{page > 1 ? ` · ${t("pageLabel")} ${page}` : ""}
        </p>
        <h1 style={{
          fontFamily: SERIF, fontSize: "clamp(30px,4vw,48px)", fontWeight: 400,
          letterSpacing: "-2px", lineHeight: 1.08, color: "#0D1016", marginBottom: 16,
        }}>
          {t("h1")}
        </h1>
        <p style={{ fontSize: 16, color: "rgba(0,0,0,0.45)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          {t("subtitle")}
        </p>
      </section>

      {/* Post grid */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px 64px" }}>
        {posts.length === 0 ? (
          <p style={{ color: "rgba(0,0,0,0.30)", textAlign: "center", fontFamily: MONO, fontSize: 13 }}>
            {t("empty")}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))", gap: 20 }}>
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} isNew={page === 1 && i === 0} />
            ))}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} t={t} />}
      </section>

      {/* CTA */}
      <section style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "64px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "rgba(0,0,0,0.42)", marginBottom: 20 }}>
          {t("ctaQuestion")}
        </p>
        <Link href="/scanner" style={{
          display: "inline-block", fontFamily: MONO, fontSize: 13, fontWeight: 500,
          color: "#ffffff", background: "#0D1016", borderRadius: 8,
          padding: "12px 28px", textDecoration: "none", letterSpacing: "0.02em",
        }}>
          {t("ctaBtn")}
        </Link>
      </section>

      <BookDemoBanner />
    </div>
  );
}

function Pagination({ page, totalPages, t }: { page: number; totalPages: number; t: (k: string) => string }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const base: React.CSSProperties = {
    fontFamily: MONO, fontSize: 13, minWidth: 40, height: 40, padding: "0 12px",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, textDecoration: "none",
  };
  const idle: React.CSSProperties = { ...base, color: "#0D1016", border: "1px solid rgba(0,0,0,0.12)", background: "#ffffff" };
  const current: React.CSSProperties = { ...base, color: "#ffffff", background: "#0D1016", border: "1px solid #0D1016" };

  return (
    <nav aria-label={t("pagination")} style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 40 }}>
      {page > 1 && (
        <Link href={risorsePageHref(page - 1)} rel="prev" style={idle}>{t("prevPage")}</Link>
      )}
      {pages.map((n) =>
        n === page ? (
          <span key={n} aria-current="page" style={current}>{n}</span>
        ) : (
          <Link key={n} href={risorsePageHref(n)} aria-label={`${t("pageLabel")} ${n}`} style={idle}>{n}</Link>
        ),
      )}
      {page < totalPages && (
        <Link href={risorsePageHref(page + 1)} rel="next" style={idle}>{t("nextPage")}</Link>
      )}
    </nav>
  );
}
