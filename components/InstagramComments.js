"use client";

import { useRef, useState } from "react";
import { Check, Clipboard, Copy, LoaderCircle, MessageSquare, X } from "lucide-react";
import { GlassButton, LiquidGlassFilter } from "@zakisheriff/liquid-glass";
import GlassCard from "@/components/GlassCard";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/providers/ToastProvider";
import { isValidSourceUrl } from "@/utils/helpers";
import styles from "@/components/InstagramComments.module.css";

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function CommentRow({ comment, highlight }) {
  const [copied, setCopied] = useState(false);
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(comment.text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className={`${styles.commentRow} ${highlight ? styles.commentHighlight : ""}`}>
      <div className={styles.commentMeta}>
        <strong>@{comment.username}</strong>
        {comment.likeCount > 0 ? <span>{comment.likeCount} likes</span> : null}
        {highlight ? <span className={styles.linkedTag}>linked comment</span> : null}
      </div>
      <p className={styles.commentText}>{comment.text || "(no text)"}</p>
      <GlassButton
        size="sm"
        intensity={4}
        variant="ghost"
        className={styles.copyBtn}
        onClick={copyText}
        title="Copy this comment"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </GlassButton>
    </div>
  );
}

export default function InstagramComments() {
  const { showToast } = useToast();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const inputRef = useRef(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" &&
     (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.startsWith("192.168."))
     ? ""
     : "https://zakisheriff-downloader-backend.hf.space");

  const fetchComments = async (url) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await getJson(`${apiBase}/api/instagram/comments?url=${encodeURIComponent(url)}`);
      setResult(data.result);
    } catch (requestError) {
      setError(requestError.message || "Could not load comments.");
      showToast({
        title: "Could not load comments",
        description: requestError.message || "Try a different link.",
        variant: "warning"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const value = input.trim();
    if (!value) {
      showToast({ title: "Link required", description: "Paste an Instagram post or comment link.", variant: "warning" });
      return;
    }
    if (!isValidSourceUrl(value)) {
      showToast({ title: "Invalid link", description: "Paste a valid http or https URL.", variant: "warning" });
      return;
    }
    fetchComments(value);
  };

  const handlePaste = async () => {
    try {
      const text = (await navigator.clipboard.readText() || "").trim();
      if (text) {
        setInput(text);
        fetchComments(text);
      }
    } catch { /* ignore */ }
  };

  const copyAll = async () => {
    if (!result?.comments?.length) return;
    const text = result.comments.map((c) => `@${c.username}: ${c.text}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
      showToast({ title: "Copied all comments", description: `${result.comments.length} comments copied.`, variant: "success" });
    } catch { /* ignore */ }
  };

  return (
    <LiquidGlassFilter>
      <div className={styles.page}>
        <GlassCard className={styles.hero}>
          <p className={styles.heading}>Instagram comment grabber</p>
          <p className={styles.sub}>
            Paste an Instagram post, reel, or comment link to get the comments as copyable text — handy when
            someone leaves a prompt or recipe in the comments and Instagram won&apos;t let you select it.
          </p>
          <div className={styles.inputCard}>
            <div className={styles.inputWrap}>
              <MessageSquare size={18} />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Paste https://instagram.com/p/... or a comment link"
              />
              {input ? (
                <GlassButton
                  className={styles.iconBtn}
                  onClick={() => setInput("")}
                  title="Clear"
                  type="button"
                  variant="ghost"
                  intensity={4}
                  size="sm"
                  style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                >
                  <X size={15} />
                </GlassButton>
              ) : (
                <GlassButton
                  className={styles.iconBtn}
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  type="button"
                  variant="ghost"
                  intensity={4}
                  size="sm"
                  style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                >
                  <Clipboard size={15} />
                </GlassButton>
              )}
            </div>
            <GlassButton
              className={styles.primaryButton}
              onClick={handleSubmit}
              size="lg"
              intensity={6}
              disabled={loading}
            >
              <span>{loading ? "Loading" : "Get comments"}</span>
              {loading ? <LoaderCircle size={18} className={styles.spin} /> : null}
            </GlassButton>
          </div>
        </GlassCard>

        {loading ? (
          <GlassCard className={styles.stateCard}>
            <LoaderCircle size={22} className={styles.spin} />
            <div>
              <strong>Loading comments</strong>
              <p>Fetching the comments for this post…</p>
            </div>
          </GlassCard>
        ) : null}

        {!loading && error ? (
          <GlassCard className={styles.errorCard}>
            <strong>Couldn&apos;t load that link.</strong>
            <p>{error}</p>
          </GlassCard>
        ) : null}

        {!loading && result ? (
          <div className={styles.results}>
            {result.post?.caption ? (
              <GlassCard className={styles.captionCard}>
                <div className={styles.commentMeta}>
                  <strong>Caption{result.post.author ? ` · @${result.post.author}` : ""}</strong>
                </div>
                <p className={styles.commentText}>{result.post.caption}</p>
              </GlassCard>
            ) : null}

            {result.matchedNotFound ? (
              <GlassCard className={styles.warningCard}>
                <strong>Linked comment not found</strong>
                <p>That specific comment wasn&apos;t in the visible set, so all available comments are shown below.</p>
              </GlassCard>
            ) : null}

            <div className={styles.resultsHeader}>
              <h3>{result.comments.length} comment{result.comments.length === 1 ? "" : "s"}</h3>
              <GlassButton size="sm" intensity={6} onClick={copyAll}>
                {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedAll ? "Copied all" : "Copy all"}</span>
              </GlassButton>
            </div>

            <div className={styles.commentList}>
              {result.comments.map((c) => (
                <CommentRow
                  key={c.id || `${c.username}-${c.text.slice(0, 12)}`}
                  comment={c}
                  highlight={result.matchedComment && c.id === result.matchedComment.id}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!loading && !result && !error ? (
          <EmptyState
            title="No comments yet"
            description="Paste an Instagram post, reel, or comment link above to pull its comments as copyable text."
          />
        ) : null}
      </div>
    </LiquidGlassFilter>
  );
}
