import Link from "next/link";
import Nav from "@/components/Nav";
import BookDemoBanner from "@/components/BookDemoBanner";
import PostCard from "./PostCard";
import { getAllPosts } from "@/lib/blog/posts";
import type { Metadata } from "next";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export const metadata: Metadata = {
  title: "Risorse AI Act — Guide, Normativa e Aggiornamenti | RegulaeOS",
  description:
    "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia. Scadenze, obblighi, Annex III, GPAI e molto altro.",
  openGraph: {
    title: "Risorse AI Act | RegulaeOS",
    description:
      "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/risorse`,
  },
};

export default function RisorseIndex() {
  const posts = getAllPosts();

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0D1016" }}>
      <Nav />

      {/* Hero */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "80px 24px 56px", textAlign: "center" }}>
        <p style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "1.5px",
          textTransform: "uppercase", color: "rgba(0,0,0,0.28)", marginBottom: 20,
        }}>
          Risorse
        </p>
        <h1 style={{
          fontFamily: SERIF, fontSize: "clamp(30px,4vw,48px)", fontWeight: 400,
          letterSpacing: "-2px", lineHeight: 1.08, color: "#0D1016", marginBottom: 16,
        }}>
          Guide e aggiornamenti sull&apos;EU AI Act
        </h1>
        <p style={{ fontSize: 16, color: "rgba(0,0,0,0.45)", lineHeight: 1.7, maxWidth: 540, margin: "0 auto" }}>
          Analisi normativa, scadenze, obblighi pratici. Senza paroloni.
        </p>
      </section>

      {/* Post grid */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "0 24px 96px" }}>
        {posts.length === 0 ? (
          <p style={{ color: "rgba(0,0,0,0.30)", textAlign: "center", fontFamily: MONO, fontSize: 13 }}>
            Nessun articolo pubblicato.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20 }}>
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} isNew={i === 0} />
            ))}
          </div>
        )}
      </section>

      <BookDemoBanner theme="dark" />

      {/* CTA */}
      <section style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "64px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "rgba(0,0,0,0.42)", marginBottom: 20 }}>
          Vuoi sapere cosa ti riguarda davvero?
        </p>
        <Link href="/scanner" style={{
          display: "inline-block", fontFamily: MONO, fontSize: 13, fontWeight: 500,
          color: "#ffffff", background: "#0D1016", borderRadius: 8,
          padding: "12px 28px", textDecoration: "none", letterSpacing: "0.02em",
        }}>
          Prova lo scanner Art. 50 gratis →
        </Link>
      </section>
    </div>
  );
}
