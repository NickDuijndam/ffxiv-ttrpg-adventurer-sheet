import { CharacterSheetData } from "../types/sheet";

const SHARE_PARAM = "sheet";

const toBase64Url = (value: string): string =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return `${base64}${padding}`;
};

const encodeUtf8Base64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return toBase64Url(window.btoa(binary));
};

const decodeUtf8Base64 = (value: string): string => {
  const binary = window.atob(fromBase64Url(value));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const buildShareUrl = (data: CharacterSheetData): string => {
  const url = new URL(window.location.href);
  url.searchParams.set(SHARE_PARAM, encodeUtf8Base64(JSON.stringify(data)));
  return url.toString();
};

export const readSharedSheetFromUrl = (): CharacterSheetData | null => {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(SHARE_PARAM);
  if (!encoded) {
    return null;
  }
  try {
    const decoded = decodeUtf8Base64(encoded);
    return JSON.parse(decoded) as CharacterSheetData;
  } catch {
    return null;
  }
};
