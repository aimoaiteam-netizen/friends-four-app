"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MEMBERS, MEMBER_EMOJIS } from "@/lib/constants";

type Step = "select" | "setup-pin" | "enter-pin";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selectedName, setSelectedName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNameSelect(name: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/check?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setSelectedName(name);
      setStep(data.hasPin ? "enter-pin" : "setup-pin");
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupPin() {
    if (pin.length !== 4) return setError("PIN은 4자리여야 해요.");
    if (pin !== confirmPin) return setError("PIN이 일치하지 않아요.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedName, pin }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "등록에 실패했습니다.");
      router.push("/home");
    } catch {
      setError("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (pin.length !== 4) return setError("PIN 4자리를 입력해주세요.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedName, pin }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "로그인에 실패했습니다.");
      router.push("/home");
    } catch {
      setError("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handlePinInput(value: string, setter: (v: string) => void) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setter(digits);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950">
      <div className="w-full max-w-sm">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🤝</div>
          <h1 className="text-3xl font-bold text-white mb-2">우리넷</h1>
          <p className="text-gray-400 text-sm">4인 한정 프라이빗 공간</p>
        </div>

        {/* Step 1: 이름 선택 */}
        {step === "select" && (
          <div>
            <p className="text-gray-300 text-center mb-6 font-medium">
              누구세요? 👀
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MEMBERS.map((name) => (
                <button
                  key={name}
                  onClick={() => handleNameSelect(name)}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all border border-gray-700 hover:border-purple-500"
                >
                  <span className="text-3xl mb-2">{MEMBER_EMOJIS[name]}</span>
                  <span className="text-white font-semibold text-sm">{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: PIN 설정 (첫 방문) */}
        {step === "setup-pin" && (
          <div>
            <button
              onClick={() => { setStep("select"); setPin(""); setConfirmPin(""); setError(""); }}
              className="text-gray-400 text-sm mb-6 flex items-center gap-1 hover:text-white"
            >
              ← 돌아가기
            </button>
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">{MEMBER_EMOJIS[selectedName]}</div>
              <p className="text-white font-semibold">{selectedName}님, 처음이시네요!</p>
              <p className="text-gray-400 text-sm mt-1">PIN 4자리를 설정해주세요</p>
            </div>
            <div className="space-y-4">
              <PinInput
                label="PIN 설정"
                value={pin}
                onChange={(v) => handlePinInput(v, setPin)}
                placeholder="•  •  •  •"
              />
              <PinInput
                label="PIN 확인"
                value={confirmPin}
                onChange={(v) => handlePinInput(v, setConfirmPin)}
                placeholder="•  •  •  •"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
            <button
              onClick={handleSetupPin}
              disabled={loading || pin.length !== 4 || confirmPin.length !== 4}
              className="w-full mt-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors active:scale-95"
            >
              {loading ? "설정 중..." : "완료 ✓"}
            </button>
          </div>
        )}

        {/* Step 3: PIN 입력 (재방문) */}
        {step === "enter-pin" && (
          <div>
            <button
              onClick={() => { setStep("select"); setPin(""); setError(""); }}
              className="text-gray-400 text-sm mb-6 flex items-center gap-1 hover:text-white"
            >
              ← 돌아가기
            </button>
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">{MEMBER_EMOJIS[selectedName]}</div>
              <p className="text-white font-semibold">안녕하세요, {selectedName}님!</p>
              <p className="text-gray-400 text-sm mt-1">PIN 4자리를 입력해주세요</p>
            </div>
            <PinInput
              label="PIN 입력"
              value={pin}
              onChange={(v) => {
                handlePinInput(v, setPin);
              }}
              placeholder="•  •  •  •"
              onComplete={handleLogin}
            />
            {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || pin.length !== 4}
              className="w-full mt-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors active:scale-95"
            >
              {loading ? "확인 중..." : "입장 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PinInput({
  label,
  value,
  onChange,
  placeholder,
  onComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onComplete?: () => void;
}) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-2 font-medium">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.replace(/\D/g, "").length === 4 && onComplete) {
            onComplete();
          }
        }}
        placeholder={placeholder}
        className="w-full py-4 px-5 rounded-2xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none text-white text-center text-2xl tracking-[0.5em] placeholder:text-gray-600 placeholder:text-base placeholder:tracking-widest"
      />
    </div>
  );
}
