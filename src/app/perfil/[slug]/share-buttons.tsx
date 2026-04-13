"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled - ignore
      }
    } else {
      handleCopyLink();
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-4 py-3 text-sm font-medium text-secondary-700 hover:bg-secondary-50 hover:shadow-sm transition-all"
        title="Copiar link do perfil"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" />
            <span className="text-success">Copiado!</span>
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Copiar Link</span>
          </>
        )}
      </button>
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-4 py-3 text-sm font-medium text-secondary-700 hover:bg-secondary-50 hover:shadow-sm transition-all"
        title="Compartilhar perfil"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Compartilhar</span>
      </button>
    </div>
  );
}
