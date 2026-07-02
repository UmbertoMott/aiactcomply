import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";
import type { Metadata } from "next";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

interface Props { params: Promise<{ slug: string }>; }

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.dateISO,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/risorse/${post.slug}`,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/risorse/${post.slug}`,
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.dateISO,
    dateModified: post.dateISO,
    author: { "@type": "Organization", name: "AIComply" },
    publisher: {
      "@type": "Organization",
      name: "AIComply",
      url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app",
    },
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://aicomply-omega.vercel.app"}/risorse/${post.slug}`,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqSchema.map(({ q, a }: { q: string; a: string }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0D1016" }}>
        <Nav />

        {/* Back */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 0" }}>
          <Link href="/risorse" style={{
            fontFamily: MONO, fontSize: 12, color: "rgba(0,0,0,0.35)",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            ← Tutte le risorse
          </Link>
        </div>

        {/* Header */}
        <header style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "rgba(0,0,0,0.38)",
              background: "rgba(0,0,0,0.05)", borderRadius: 20, padding: "3px 10px",
            }}>
              {post.category}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.28)" }}>{post.date}</span>
            <span style={{ color: "rgba(0,0,0,0.20)" }}>·</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.28)" }}>{post.readTime} di lettura</span>
          </div>

          <h1 style={{
            fontFamily: SERIF, fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 400,
            letterSpacing: "-1.5px", lineHeight: 1.15, color: "#0D1016", marginBottom: 20,
          }}>
            {post.title}
          </h1>

          <p style={{ fontSize: 16, color: "rgba(0,0,0,0.48)", lineHeight: 1.7 }}>
            {post.excerpt}
          </p>
        </header>

        {/* Article body */}
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 96px" }}>
          <style>{`
            .ac-post h2 {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 22px;
              font-weight: 400;
              letter-spacing: -0.6px;
              color: #0D1016;
              margin: 48px 0 16px;
              line-height: 1.25;
            }
            .ac-post p {
              font-size: 16px;
              line-height: 1.78;
              color: rgba(0,0,0,0.58);
              margin: 0 0 18px;
            }
            .ac-post strong { color: #0D1016; font-weight: 600; }
            .ac-post a {
              color: #0D1016;
              text-decoration: none;
              border-bottom: 1px solid rgba(0,0,0,0.20);
              transition: border-color 0.2s;
            }
            .ac-post a:hover { border-bottom-color: #0D1016; }
            .ac-tldr {
              background: rgba(0,0,0,0.03);
              border: 1px solid rgba(0,0,0,0.09);
              border-left: 3px solid #0D1016;
              border-radius: 8px;
              padding: 18px 20px;
              color: rgba(0,0,0,0.58) !important;
              margin-bottom: 32px !important;
            }
            .ac-tldr strong { color: #0D1016 !important; }
            .ac-table-wrap { overflow-x: auto; margin: 8px 0 28px; }
            .ac-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .ac-table th {
              text-align: left;
              padding: 10px 14px;
              background: rgba(0,0,0,0.03);
              color: rgba(0,0,0,0.40);
              font-weight: 600;
              font-size: 11px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              border-bottom: 1px solid rgba(0,0,0,0.08);
              font-family: 'DM Mono', monospace;
            }
            .ac-table td {
              padding: 10px 14px;
              color: rgba(0,0,0,0.58);
              border-bottom: 1px solid rgba(0,0,0,0.06);
              vertical-align: top;
              font-size: 14px;
            }
            .ac-table tr:last-child td { border-bottom: none; }
            .ac-passed { color: #0D1016 !important; font-weight: 600; }
            .ac-soon   { color: rgba(0,0,0,0.55) !important; }
            .ac-omnibus { color: rgba(0,0,0,0.42) !important; font-style: italic; }
          `}</style>

          <div className="ac-post" dangerouslySetInnerHTML={{ __html: post.content }} />

          {post.tags.length > 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              marginTop: 48, paddingTop: 32,
              borderTop: "1px solid rgba(0,0,0,0.07)",
            }}>
              {post.tags.map((tag: string) => (
                <span key={tag} style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11,
                  color: "rgba(0,0,0,0.38)", background: "rgba(0,0,0,0.05)",
                  borderRadius: 20, padding: "4px 12px",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* CTA */}
        <section style={{
          borderTop: "1px solid rgba(0,0,0,0.07)",
          padding: "64px 24px",
          textAlign: "center",
          background: "#FAFAF9",
        }}>
          <p style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 22, fontWeight: 400, letterSpacing: "-0.6px",
            color: "#0D1016", marginBottom: 10,
          }}>
            Verifica la compliance del tuo sistema AI
          </p>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.42)", marginBottom: 28 }}>
            Lo scanner Art. 50 analizza il tuo sito o prodotto AI in pochi minuti. Gratis.
          </p>
          <Link href="/scanner" style={{
            display: "inline-block", fontFamily: "'DM Mono', monospace",
            fontSize: 13, fontWeight: 500, color: "#ffffff",
            background: "#0D1016", borderRadius: 8,
            padding: "13px 32px", textDecoration: "none",
          }}>
            Prova lo scanner gratuito →
          </Link>
        </section>
      </div>
    </>
  );
}
