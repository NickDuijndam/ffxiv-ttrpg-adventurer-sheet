import { CharacterSheetData } from "../types/sheet";

const STORAGE_KEY = "ffxiv_ttrpg_adventurer_sheet_v1";

export const loadSheetData = (): CharacterSheetData | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CharacterSheetData;
  } catch {
    return null;
  }
};

export const saveSheetData = (data: CharacterSheetData): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const clearSheetData = (): void => {
  window.localStorage.removeItem(STORAGE_KEY);
};
