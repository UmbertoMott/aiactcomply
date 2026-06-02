"use client";

import Link from "next/link";
import type { BlogPost } from "@/lib/blog/posts";

export default function PostCard({
  post,
  isNew,
}: {
  post: BlogPost;
  isNew: boolean;
}) {
  return (
    <Link href={`/risorse/${post.slug}`} style={{ textDecoration: "none" }}>
      <article
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "28px 28px 24px",
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "100%",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(255,255,255,0.14)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.04)";
          (e.currentTarget as HTMLElement).style.borderColor =
            "rgba(255,255,255,0.08)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.07)",
              borderRadius: 9999,
              padding: "3px 10px",
            }}
          >
            {post.category}
          </span>
          {isNew && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#60a5fa",
                background: "rgba(96,165,250,0.12)",
                borderRadius: 9999,
                padding: "3px 10px",
              }}
            >
              Nuovo
            </span>
          )}
        </div>

        <h2
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.4px",
            lineHeight: 1.4,
            color: "#ffffff",
            margin: 0,
          }}
        >
          {post.title}
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
            margin: 0,
            flexGrow: 1,
          }}
        >
          {post.excerpt}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {post.date}
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>·</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {post.readTime} di lettura
          </span>
        </div>
      </article>
    </Link>
  );
}
