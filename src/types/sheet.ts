export interface ItemRow {
  name: string;
  quantity: string;
  notes: string;
}

export interface TraitEntry {
  level: string;
  name: string;
  type: string;
  resourceSlots: number;
  resources: boolean[];
  description: string;
}

export interface AbilityEntry {
  name: string;
  type: string;
  resourceSlots: number;
  resources: boolean[];
  description: string;
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
  traits: TraitEntry[];
  items: ItemRow[];
  abilities: {
    primary: AbilityEntry[];
    secondary: AbilityEntry[];
    instant: AbilityEntry[];
  };
}

export const ITEM_ROW_COUNT = 10;
export const DEFAULT_TRAIT_COUNT = 3;

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
  traits: Array.from({ length: DEFAULT_TRAIT_COUNT }, () => ({
    level: "",
    name: "",
    type: "",
    resourceSlots: 0,
    resources: [],
    description: ""
  })),
  items: Array.from({ length: ITEM_ROW_COUNT }, () => ({
    name: "",
    quantity: "",
    notes: ""
  })),
  abilities: {
    primary: [],
    secondary: [],
    instant: []
  }
});
