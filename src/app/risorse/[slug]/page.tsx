import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getPostBySlug, getAllPosts } from "@/lib/blog/posts";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

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
    mainEntity: post.faqSchema.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div style={{ minHeight: "100vh", background: "#0D1016", color: "#ffffff" }}>
        <Nav />

        {/* Back */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 0" }}>
          <Link
            href="/risorse"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Tutte le risorse
          </Link>
        </div>

        {/* Header */}
        <header style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.07)",
                borderRadius: 9999,
                padding: "3px 10px",
              }}
            >
              {post.category}
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{post.date}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{post.readTime} di lettura</span>
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "-0.9px",
              lineHeight: 1.2,
              color: "#ffffff",
              marginBottom: 20,
            }}
          >
            {post.title}
          </h1>

          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
            {post.excerpt}
          </p>
        </header>

        {/* Article body */}
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 96px" }}>
          <style>{`
            .ac-post h2 {
              font-size: 22px;
              font-weight: 500;
              letter-spacing: -0.5px;
              color: #ffffff;
              margin: 48px 0 16px;
              line-height: 1.3;
            }
            .ac-post p {
              font-size: 16px;
              line-height: 1.75;
              color: rgba(255,255,255,0.65);
              margin: 0 0 18px;
            }
            .ac-post strong { color: rgba(255,255,255,0.85); font-weight: 500; }
            .ac-post a {
              color: #60a5fa;
              text-decoration: none;
              border-bottom: 1px solid rgba(96,165,250,0.3);
              transition: border-color 0.2s;
            }
            .ac-post a:hover { border-bottom-color: #60a5fa; }
            .ac-tldr {
              background: rgba(96,165,250,0.08);
              border: 1px solid rgba(96,165,250,0.18);
              border-radius: 10px;
              padding: 18px 20px;
              color: rgba(255,255,255,0.7) !important;
              margin-bottom: 32px !important;
            }
            .ac-tldr strong { color: #60a5fa !important; }
            .ac-table-wrap { overflow-x: auto; margin: 8px 0 28px; }
            .ac-table { width: 100%; border-collapse: collapse; font-size: 14px; }
            .ac-table th {
              text-align: left;
              padding: 10px 14px;
              background: rgba(255,255,255,0.06);
              color: rgba(255,255,255,0.45);
              font-weight: 500;
              font-size: 12px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .ac-table td {
              padding: 10px 14px;
              color: rgba(255,255,255,0.65);
              border-bottom: 1px solid rgba(255,255,255,0.05);
              vertical-align: top;
            }
            .ac-table tr:last-child td { border-bottom: none; }
            .ac-passed { color: #4ade80 !important; }
            .ac-soon { color: #f97316 !important; }
            .ac-omnibus { color: #60a5fa !important; }
          `}</style>

          <div className="ac-post" dangerouslySetInnerHTML={{ __html: post.content }} />

          {post.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 48,
                paddingTop: 32,
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 9999,
                    padding: "4px 12px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* CTA */}
        <section
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "64px 24px",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.5px", color: "#ffffff", marginBottom: 10 }}>
            Verifica la compliance del tuo sistema AI
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>
            Lo scanner Art. 50 analizza il tuo sito o prodotto AI in pochi minuti. Gratis.
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
              padding: "13px 32px",
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Prova lo scanner gratuito →
          </Link>
        </section>
      </div>
    </>
  );
}
