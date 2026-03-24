"use client";

import { useState } from "react";
import { MEMBER_EMOJIS } from "@/lib/constants";

interface Post {
  id: number;
  content: string;
  imageUrl: string | null;
  likedBy: string;
  createdAt: string;
  author: { name: string };
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: { name: string };
}

interface PostCardProps {
  post: Post;
  currentUser: string;
  onLike: (id: number) => void;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function shortTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PostCard({ post, currentUser, onLike }: PostCardProps) {
  const likedBy: string[] = JSON.parse(post.likedBy);
  const liked = likedBy.includes(currentUser);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [sending, setSending] = useState(false);

  async function toggleComments() {
    setShowComments((prev) => !prev);
    if (!commentsLoaded) {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      setComments(await res.json());
      setCommentsLoaded(true);
    }
  }

  async function handleSendComment() {
    if (!commentInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [...prev, c]);
        setCommentInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      {/* 작성자 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-lg">
          {MEMBER_EMOJIS[post.author.name] ?? "👤"}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{post.author.name}</p>
          <p className="text-gray-500 text-xs">{relativeTime(post.createdAt)}</p>
        </div>
      </div>

      {/* 본문 */}
      <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap mb-3">
        {post.content}
      </p>

      {/* 이미지 */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="첨부 이미지"
          className="w-full rounded-xl mb-3 object-cover max-h-72"
        />
      )}

      {/* 액션 바 */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-700">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-colors px-3 py-1.5 rounded-xl ${
            liked
              ? "text-red-400 bg-red-400/10"
              : "text-gray-500 hover:text-red-400 hover:bg-red-400/10"
          }`}
        >
          <span>{liked ? "❤️" : "🤍"}</span>
          {likedBy.length > 0 && <span>{likedBy.length}</span>}
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 px-3 py-1.5 rounded-xl transition-colors"
        >
          <span>💬</span>
          <span>{commentsLoaded ? comments.length : "댓글"}</span>
        </button>

        {likedBy.length > 0 && (
          <p className="text-gray-600 text-xs flex-1 truncate">
            {likedBy.join(", ")}
          </p>
        )}
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="mt-3 space-y-2 pt-3 border-t border-gray-700">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-600">아직 댓글이 없어요.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <span className="text-sm flex-shrink-0">{MEMBER_EMOJIS[c.author.name] ?? "👤"}</span>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 font-medium">{c.author.name}</span>
                  <span className="text-xs text-gray-600 ml-1.5">{shortTime(c.createdAt)}</span>
                  <p className="text-xs text-gray-200 mt-0.5 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}

          {/* 댓글 입력 */}
          <div className="flex gap-2 pt-1">
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder="댓글 입력..."
              className="flex-1 bg-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              onClick={handleSendComment}
              disabled={sending || !commentInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
