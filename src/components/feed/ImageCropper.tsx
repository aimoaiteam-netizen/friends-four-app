"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

const ASPECT = 4 / 3;

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const updateLayout = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = cw / ASPECT;
    setContainerSize({ w: cw, h: ch });

    const img = imgRef.current;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Scale image so it fills the crop area
    const fillScale = Math.max(cw / iw, ch / ih);
    setImgSize({ w: iw, h: ih });
    setScale(fillScale);
    setOffset({ x: (cw - iw * fillScale) / 2, y: (ch - ih * fillScale) / 2 });
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) updateLayout();
    else img.onload = updateLayout;
  }, [imageSrc, updateLayout]);

  function clampOffset(ox: number, oy: number, s: number) {
    const sw = imgSize.w * s;
    const sh = imgSize.h * s;
    const maxX = 0;
    const maxY = 0;
    const minX = containerSize.w - sw;
    const minY = containerSize.h - sh;
    return {
      x: Math.min(maxX, Math.max(minX, ox)),
      y: Math.min(maxY, Math.max(minY, oy)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy, scale));
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function handleZoom(e: React.ChangeEvent<HTMLInputElement>) {
    const newScale = parseFloat(e.target.value);
    // Zoom centered on crop area center
    const cx = containerSize.w / 2;
    const cy = containerSize.h / 2;
    const newOx = cx - ((cx - offset.x) / scale) * newScale;
    const newOy = cy - ((cy - offset.y) / scale) * newScale;
    setScale(newScale);
    setOffset(clampOffset(newOx, newOy, newScale));
  }

  function handleCrop() {
    const canvas = document.createElement("canvas");
    const MAX = 800;
    const outW = Math.min(MAX, containerSize.w * 2);
    const outH = outW / ASPECT;
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imgRef.current) return;

    // Calculate source rectangle
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = containerSize.w / scale;
    const sh = containerSize.h / scale;

    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCrop(blob, URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.7,
    );
  }

  const minScale = Math.max(containerSize.w / (imgSize.w || 1), containerSize.h / (imgSize.h || 1));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 text-center">드래그로 위치 조정, 슬라이더로 확대/축소</p>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-purple-500 cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ width: "100%", height: containerSize.h || "auto", aspectRatio: containerSize.h ? undefined : `${ASPECT}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="crop"
          draggable={false}
          className="absolute"
          style={{
            width: imgSize.w * scale,
            height: imgSize.h * scale,
            left: offset.x,
            top: offset.y,
            maxWidth: "none",
          }}
        />
      </div>

      {imgSize.w > 0 && (
        <input
          type="range"
          min={minScale}
          max={minScale * 3}
          step={0.01}
          value={scale}
          onChange={handleZoom}
          className="w-full accent-purple-500"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-400 text-sm"
        >
          취소
        </button>
        <button
          onClick={handleCrop}
          className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
        >
          자르기
        </button>
      </div>
    </div>
  );
}
