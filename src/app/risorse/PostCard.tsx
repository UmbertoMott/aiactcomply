"use client";

import Link from "next/link";
import type { BlogPost } from "@/lib/blog/posts";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO  = "'DM Mono', monospace";

export default function PostCard({ post, isNew }: { post: BlogPost; isNew: boolean }) {
  return (
    <Link href={`/risorse/${post.slug}`} style={{ textDecoration: "none" }}>
      <article
        style={{
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: "24px 24px 20px",
          cursor: "pointer",
          transition: "border-color 0.2s, box-shadow 0.2s",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          height: "100%",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.18)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: "0.07em",
            textTransform: "uppercase", color: "rgba(0,0,0,0.38)",
            background: "rgba(0,0,0,0.05)", borderRadius: 20, padding: "3px 10px",
          }}>
            {post.category}
          </span>
          {isNew && (
            <span style={{
              fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "#0D1016",
              background: "rgba(0,0,0,0.07)", borderRadius: 20, padding: "3px 10px",
            }}>
              Nuovo
            </span>
          )}
        </div>

        <h2 style={{
          fontFamily: SERIF, fontSize: 18, fontWeight: 400,
          letterSpacing: "-0.5px", lineHeight: 1.35, color: "#0D1016", margin: 0,
        }}>
          {post.title}
        </h2>

        <p style={{ fontSize: 13.5, color: "rgba(0,0,0,0.48)", lineHeight: 1.65, margin: 0, flexGrow: 1 }}>
          {post.excerpt}
        </p>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, paddingTop: 12,
          borderTop: "1px solid rgba(0,0,0,0.06)",
          fontFamily: MONO, fontSize: 11, color: "rgba(0,0,0,0.28)",
        }}>
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readTime} di lettura</span>
        </div>
      </article>
    </Link>
  );
}
