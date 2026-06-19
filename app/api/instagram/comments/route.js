import { NextResponse } from "next/server";
import { fetchInstagramComments } from "@/utils/server/ytDlp";
import { isValidSourceUrl, normalizeSourceUrl } from "@/utils/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";

  if (!isValidSourceUrl(rawUrl)) {
    return NextResponse.json({ error: "Paste a valid Instagram post, reel, or comment link." }, { status: 400 });
  }

  const sourceUrl = normalizeSourceUrl(rawUrl);
  const isInstagram = sourceUrl.includes("instagram.com") || sourceUrl.includes("instagr.am");
  if (!isInstagram) {
    return NextResponse.json({ error: "This tool only works with Instagram links." }, { status: 400 });
  }

  const shortcodeMatch = sourceUrl.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9-_]+)/);
  if (!shortcodeMatch) {
    return NextResponse.json(
      { error: "Couldn't find a post in that link. Use a link like instagram.com/p/XXXX/ or a comment link." },
      { status: 400 }
    );
  }

  const shortcode = shortcodeMatch[1];
  const commentIdMatch = sourceUrl.match(/\/c\/(\d+)/);
  let wantedCommentId = commentIdMatch ? commentIdMatch[1] : "";
  if (!wantedCommentId) {
    try {
      const parsedUrl = new URL(sourceUrl);
      wantedCommentId = parsedUrl.searchParams.get("comment_id") || "";
    } catch {
      const commentIdParamMatch = sourceUrl.match(/[?&]comment_id=(\d+)/);
      if (commentIdParamMatch) {
        wantedCommentId = commentIdParamMatch[1];
      }
    }
  }

  try {
    const { post, comments } = await fetchInstagramComments(shortcode, wantedCommentId);

    // If the link pointed at a specific comment, surface it first.
    let matched = null;
    let ordered = comments;
    if (wantedCommentId) {
      matched = comments.find((c) => c.id === wantedCommentId) || null;
      if (matched) {
        ordered = [matched, ...comments.filter((c) => c.id !== wantedCommentId)];
      }
    }

    return NextResponse.json({
      result: {
        sourceUrl,
        shortcode,
        post,
        wantedCommentId,
        matchedComment: matched,
        matchedNotFound: Boolean(wantedCommentId) && !matched,
        comments: ordered
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not load comments for this link." },
      { status: error.statusCode || 500 }
    );
  }
}
