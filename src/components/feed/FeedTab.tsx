"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { consume } from "@/lib/prefetch";
import PostCard from "./PostCard";
import ImageCropper from "./ImageCropper";

interface Post {
  id: number;
  content: string;
  hasImage: boolean;
  likedBy: string;
  createdAt: string;
  author: { name: string };
  _count: { comments: number };
}

export default function FeedTab({ currentUser }: { currentUser: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (window.scrollY > 0 || touchStartY.current === 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) setPullDistance(Math.min(diff, 100));
  }

  async function onTouchEnd() {
    if (pullDistance > 60) {
      setRefreshing(true);
      await fetchPosts();
      setRefreshing(false);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      setPosts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = consume("posts");
    if (cached) { setPosts(cached); setLoading(false); return; }
    fetchPosts();
  }, [fetchPosts]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif") {
        setConverting(true);
        const { heicTo } = await import("heic-to");
        const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.8 });
        file = new File([blob as Blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
        setConverting(false);
      }
      const reader = new FileReader();
      reader.onload = () => setRawImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 처리 중 오류가 발생했어요.");
    } finally {
      setConverting(false);
    }
  }

  function handleCropComplete(croppedDataUrl: string) {
    setImageDataUrl(croppedDataUrl);
    setRawImageSrc(null);
  }

  function handleCropCancel() {
    setRawImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleCancel() {
    setShowForm(false);
    setNewContent("");
    setImageDataUrl(null);
    setRawImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePost() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, imageUrl: imageDataUrl ?? null }),
      });
      if (res.ok) {
        const post = await res.json();
        setPosts((prev) => [post, ...prev]);
        handleCancel();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId: number) {
    // Optimistic update
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const likedBy: string[] = JSON.parse(p.likedBy);
      const newLikedBy = likedBy.includes(currentUser)
        ? likedBy.filter((n) => n !== currentUser)
        : [...likedBy, currentUser];
      return { ...p, likedBy: JSON.stringify(newLikedBy) };
    }));
    // Sync with server
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    }
  }

  return (
    <div
      className="space-y-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 풀다운 새로고침 */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex justify-center items-center text-gray-500 text-xs transition-all overflow-hidden"
          style={{ height: refreshing ? 32 : pullDistance * 0.4 }}
        >
          {refreshing ? "새로고침 중..." : pullDistance > 60 ? "놓으면 새로고침" : "↓ 당겨서 새로고침"}
        </div>
      )}
      {/* 글쓰기 폼 */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gray-800 border border-gray-700 text-gray-500 text-sm text-left hover:border-purple-500 transition-colors"
        >
          ✏️ &nbsp;무슨 생각 하고 있어요?
        </button>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 border border-purple-500 space-y-3">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="무슨 생각 하고 있어요? ✍️"
            rows={3}
            className="w-full bg-transparent text-gray-100 text-sm placeholder:text-gray-600 resize-none focus:outline-none"
            autoFocus
          />

          {/* 이미지 첨부 영역 */}
          <div>
            {rawImageSrc ? (
              <ImageCropper
                imageSrc={rawImageSrc}
                onCrop={handleCropComplete}
                onCancel={handleCropCancel}
              />
            ) : imageDataUrl ? (
              <div className="relative">
                <img
                  src={imageDataUrl}
                  alt="미리보기"
                  className="w-full rounded-xl object-cover max-h-48"
                />
                <button
                  onClick={() => { setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-dashed border-gray-600 hover:border-purple-500 text-gray-500 hover:text-purple-400 text-sm transition-colors ${converting ? "opacity-50 pointer-events-none" : ""}`}>
                <span>{converting ? "⌛ 변환 중..." : "📷 사진 첨부"}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={converting}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm hover:border-gray-500"
            >
              취소
            </button>
            <button
              onClick={handlePost}
              disabled={submitting || !newContent.trim() || converting}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
            >
              {submitting ? "올리는 중..." : "올리기"}
            </button>
          </div>
        </div>
      )}

      {/* 피드 */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">📭</p>
          <p>아직 게시물이 없어요.</p>
          <p className="text-sm mt-1">첫 번째 글을 올려보세요!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            onLike={handleLike}
          />
        ))
      )}
    </div>
  );
}
