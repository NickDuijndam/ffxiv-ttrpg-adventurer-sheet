export interface ItemRow {
  name: string;
  quantity: string;
  notes: string;
}

export interface CharacterSheetData {
  name: string;
  race: string;
  level: string;
  role: string;
  job: string;
  portrait: string;
  primaryAttributes: {
    str: string;
    dex: string;
    vit: string;
    int: string;
    mnd: string;
  };
  secondaryAttributes: {
    defense: string;
    magicDefense: string;
    vigilance: string;
    speed: string;
  };
  mpMax: string;
  hpMax: string;
  barrier: string;
  profile: string;
  traits: string;
  items: ItemRow[];
  abilities: string;
}

export const ITEM_ROW_COUNT = 10;

export const createDefaultSheetData = (): CharacterSheetData => ({
  name: "",
  race: "",
  level: "",
  role: "",
  job: "",
  portrait: "",
  primaryAttributes: {
    str: "",
    dex: "",
    vit: "",
    int: "",
    mnd: ""
  },
  secondaryAttributes: {
    defense: "",
    magicDefense: "",
    vigilance: "",
    speed: ""
  },
  mpMax: "",
  hpMax: "",
  barrier: "",
  profile: "",
  traits: "",
  items: Array.from({ length: ITEM_ROW_COUNT }, () => ({
    name: "",
    quantity: "",
    notes: ""
  })),
  abilities: ""
});
