"use client";

import { useState } from "react";

export default function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="joincode">
      <span>Join code</span>
      <b>{code}</b>
      <button
        type="button"
        className="b sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
