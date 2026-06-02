import Link from "next/link";
import Nav from "@/components/Nav";
import PostCard from "./PostCard";
import { getAllPosts } from "@/lib/blog/posts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risorse AI Act — Guide, Normativa e Aggiornamenti | AIComply",
  description:
    "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia. Scadenze, obblighi, Annex III, GPAI e molto altro.",
  openGraph: {
    title: "Risorse AI Act | AIComply",
    description:
      "Guide pratiche sull'EU AI Act, aggiornamenti normativi e risorse per la compliance AI in Italia.",
    type: "website",
    url: "https://aicomply-omega.vercel.app/risorse",
  },
};

export default function RisorseIndex() {
  const posts = getAllPosts();

  return (
    <div style={{ minHeight: "100vh", background: "#0D1016", color: "#ffffff" }}>
      <Nav />

      {/* Hero */}
      <section
        style={{
          maxWidth: 840,
          margin: "0 auto",
          padding: "80px 24px 56px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Risorse
        </p>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "-1px",
            lineHeight: 1.15,
            color: "#ffffff",
            marginBottom: 16,
          }}
        >
          Guide e aggiornamenti sull&apos;EU AI Act
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.65,
            maxWidth: 540,
            margin: "0 auto",
          }}
        >
          Analisi normativa, scadenze, obblighi pratici. Senza paroloni.
        </p>
      </section>

      {/* Post grid */}
      <section
        style={{
          maxWidth: 840,
          margin: "0 auto",
          padding: "0 24px 96px",
        }}
      >
        {posts.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
            Nessun articolo pubblicato.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 24,
            }}
          >
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} isNew={i === 0} />
            ))}
          </div>
        )}
      </section>

      {/* CTA bottom */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 20,
          }}
        >
          Vuoi sapere cosa ti riguarda davvero?
        </p>
        <Link
          href="/scanner"
          style={{
            display: "inline-block",
            fontSize: 14,
            fontWeight: 500,
            color: "#0D1016",
            background: "#ffffff",
            borderRadius: 9999,
            padding: "12px 28px",
            textDecoration: "none",
            letterSpacing: "-0.2px",
          }}
        >
          Prova lo scanner Art. 50 gratis →
        </Link>
      </section>
    </div>
  );
}
