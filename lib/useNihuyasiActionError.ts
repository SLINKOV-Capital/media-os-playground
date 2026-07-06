"use client";

import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import {
  NIHUYASI_ERROR_MESSAGES,
  type NihuyasiErrorCode,
} from "@/lib/nihuyasi";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useNihuyasiActionError(
  setError: (message: string | null) => void
) {
  const router = useRouter();

  return useCallback(
    (error: NihuyasiErrorCode) => {
      if (error === "auth") {
        router.push(COCKPIT_LOGIN_PATH);
        return;
      }

      setError(NIHUYASI_ERROR_MESSAGES[error]);
    },
    [router, setError]
  );
}
