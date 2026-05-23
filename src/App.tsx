import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Field } from "./components/form/Field";
import { RichTextEditor } from "./components/form/RichTextEditor";
import { Panel } from "./components/layout/Panel";
import {
  AbilityEntry,
  CharacterSheetData,
  DEFAULT_TRAIT_COUNT,
  ItemRow,
  TraitEntry,
  createDefaultSheetData
} from "./types/sheet";
import { buildShareUrl, readSharedSheetFromUrl } from "./utils/share";
import { clearSheetData, loadSheetData, saveSheetData } from "./utils/storage";

const isValidSheetData = (value: unknown): value is CharacterSheetData => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return Array.isArray(data.items) && typeof data.primaryAttributes === "object";
};

const containsHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ALLOWED_RICH_TEXT_TAGS = new Set([
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "br",
  "p",
  "div"
]);

const sanitizeRichTextHtml = (value: string): string => {
  const template = document.createElement("template");
  template.innerHTML = value;

  const walk = (parent: ParentNode): void => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) {
        node.remove();
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();

      if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        walk(parent);
        continue;
      }

      for (const attr of Array.from(element.attributes)) {
        element.removeAttribute(attr.name);
      }

      walk(element);
    }
  };

  walk(template.content);
  return template.innerHTML.replace(/>\s+</g, "><").trim();
};

const toRichTextHtml = (value: string): string => {
  if (!value) {
    return "";
  }
  if (containsHtml(value)) {
    return sanitizeRichTextHtml(value);
  }
  return escapeHtml(value).replace(/\n/g, "<br>");
};

interface LegacySheetData extends Omit<CharacterSheetData, "traits" | "abilities"> {
  traits: string | TraitEntry[];
  abilities:
    | CharacterSheetData["abilities"]
    | {
        primary?: string | AbilityEntry[];
        secondary?: string | AbilityEntry[];
        instant?: string | AbilityEntry[];
      }
    | string;
}

const createEmptyTrait = (resourceSlots = 0): TraitEntry => ({
  level: "",
  name: "",
  type: "",
  resourceSlots,
  resources: Array.from({ length: resourceSlots }, () => false),
  description: ""
});

const createEmptyAbility = (resourceSlots = 0): AbilityEntry => ({
  name: "",
  type: "",
  resourceSlots,
  resources: Array.from({ length: resourceSlots }, () => false),
  description: ""
});

const normalizeTraits = (traits: string | TraitEntry[] | undefined): TraitEntry[] => {
  if (Array.isArray(traits)) {
    const cleaned = traits.map((trait) => {
      const safeSlots = Number.isFinite(trait.resourceSlots)
        ? Math.max(0, Math.min(12, Math.floor(trait.resourceSlots)))
        : 0;
      const safeResources = Array.from({ length: safeSlots }, (_, index) =>
        Boolean(trait.resources?.[index])
      );

      return {
        level: trait.level ?? "",
        name: trait.name ?? "",
        type: trait.type ?? "",
        resourceSlots: safeSlots,
        resources: safeResources,
        description: toRichTextHtml(trait.description ?? "")
      };
    });

    if (cleaned.length === 0) {
      return [createEmptyTrait()];
    }

    return cleaned;
  }

  const firstDescription = typeof traits === "string" ? toRichTextHtml(traits) : "";
  return Array.from({ length: DEFAULT_TRAIT_COUNT }, (_, index) => ({
    ...createEmptyTrait(),
    description: index === 0 ? firstDescription : ""
  }));
};

const normalizeAbilityEntries = (value: string | AbilityEntry[] | undefined): AbilityEntry[] => {
  if (Array.isArray(value)) {
    const cleaned = value.map((ability) => {
      const safeSlots = Number.isFinite(ability.resourceSlots)
        ? Math.max(0, Math.min(12, Math.floor(ability.resourceSlots)))
        : 0;
      const safeResources = Array.from({ length: safeSlots }, (_, index) =>
        Boolean(ability.resources?.[index])
      );

      return {
        name: ability.name ?? "",
        type: ability.type ?? "",
        resourceSlots: safeSlots,
        resources: safeResources,
        description: toRichTextHtml(ability.description ?? "")
      };
    });

    return cleaned;
  }

  if (typeof value === "string" && value.length > 0) {
    return [
      {
        ...createEmptyAbility(),
        description: toRichTextHtml(value)
      }
    ];
  }

  return [];
};

const normalizeAbilities = (
  abilities: LegacySheetData["abilities"]
): CharacterSheetData["abilities"] => {
  if (typeof abilities === "string") {
    return {
      primary: normalizeAbilityEntries(abilities),
      secondary: [],
      instant: []
    };
  }

  return {
    primary: normalizeAbilityEntries(abilities?.primary),
    secondary: normalizeAbilityEntries(abilities?.secondary),
    instant: normalizeAbilityEntries(abilities?.instant)
  };
};

const migrateRichTextFields = (data: LegacySheetData): CharacterSheetData => ({
  ...data,
  profile: toRichTextHtml(data.profile),
  traits: normalizeTraits(data.traits),
  abilities: normalizeAbilities(data.abilities)
});

const sanitizeSheetForPersistence = (sheet: CharacterSheetData): CharacterSheetData => ({
  ...sheet,
  profile: toRichTextHtml(sheet.profile),
  traits: sheet.traits.map((trait) => ({
    ...trait,
    description: toRichTextHtml(trait.description)
  })),
  abilities: {
    primary: sheet.abilities.primary.map((ability) => ({
      ...ability,
      description: toRichTextHtml(ability.description)
    })),
    secondary: sheet.abilities.secondary.map((ability) => ({
      ...ability,
      description: toRichTextHtml(ability.description)
    })),
    instant: sheet.abilities.instant.map((ability) => ({
      ...ability,
      description: toRichTextHtml(ability.description)
    }))
  }
});

const App = (): JSX.Element => {
  type AbilitySectionKey = keyof CharacterSheetData["abilities"];
  const clampResourceCount = (value: number): number => Math.max(0, Math.min(12, value));

  const loadedData = useMemo(() => {
    const sharedData = readSharedSheetFromUrl();
    if (sharedData && isValidSheetData(sharedData)) {
      return migrateRichTextFields(sharedData as LegacySheetData);
    }
    const storedData = loadSheetData();
    return storedData && isValidSheetData(storedData)
      ? migrateRichTextFields(storedData as LegacySheetData)
      : null;
  }, []);
  const [sheet, setSheet] = useState<CharacterSheetData>(
    loadedData && isValidSheetData(loadedData) ? loadedData : createDefaultSheetData()
  );
  const [darkMode, setDarkMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [shareState, setShareState] = useState<string>("");
  const [traitResourceCount, setTraitResourceCount] = useState<number>(0);
  const [abilityResourceCounts, setAbilityResourceCounts] = useState<
    Record<AbilitySectionKey, number>
  >({
    primary: 0,
    secondary: 0,
    instant: 0
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveSheetData(sanitizeSheetForPersistence(sheet));
      setLastSavedAt(new Date().toLocaleTimeString());
    }, 200);

    return () => window.clearTimeout(id);
  }, [sheet]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const updateItem = (index: number, patch: Partial<ItemRow>): void => {
    setSheet((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  const addItem = (): void => {
    setSheet((current) => ({
      ...current,
      items: [...current.items, { name: "", quantity: "", notes: "" }]
    }));
  };

  const removeItem = (index: number): void => {
    setSheet((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index)
    }));
  };

  const updateTrait = (index: number, patch: Partial<TraitEntry>): void => {
    setSheet((current) => ({
      ...current,
      traits: current.traits.map((trait, i) => (i === index ? { ...trait, ...patch } : trait))
    }));
  };

  const toggleTraitResource = (traitIndex: number, resourceIndex: number): void => {
    setSheet((current) => ({
      ...current,
      traits: current.traits.map((trait, index) => {
        if (index !== traitIndex) {
          return trait;
        }
        return {
          ...trait,
          resources: trait.resources.map((value, i) => (i === resourceIndex ? !value : value))
        };
      })
    }));
  };

  const addTrait = (): void => {
    const parsed = clampResourceCount(Math.floor(traitResourceCount));
    setSheet((current) => ({
      ...current,
      traits: [...current.traits, createEmptyTrait(parsed)]
    }));
  };

  const removeTrait = (index: number): void => {
    setSheet((current) => ({
      ...current,
      traits: current.traits.filter((_, i) => i !== index)
    }));
  };

  const updateAbility = (
    section: AbilitySectionKey,
    index: number,
    patch: Partial<AbilityEntry>
  ): void => {
    setSheet((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [section]: current.abilities[section].map((ability, i) =>
          i === index ? { ...ability, ...patch } : ability
        )
      }
    }));
  };

  const toggleAbilityResource = (
    section: AbilitySectionKey,
    abilityIndex: number,
    resourceIndex: number
  ): void => {
    setSheet((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [section]: current.abilities[section].map((ability, index) => {
          if (index !== abilityIndex) {
            return ability;
          }
          return {
            ...ability,
            resources: ability.resources.map((value, i) => (i === resourceIndex ? !value : value))
          };
        })
      }
    }));
  };

  const addAbility = (section: AbilitySectionKey): void => {
    const parsed = clampResourceCount(Math.floor(abilityResourceCounts[section]));
    setSheet((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [section]: [...current.abilities[section], createEmptyAbility(parsed)]
      }
    }));
  };

  const removeAbility = (section: AbilitySectionKey, index: number): void => {
    setSheet((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [section]: current.abilities[section].filter((_, i) => i !== index)
      }
    }));
  };

  const exportJson = (): void => {
    const payload = sanitizeSheetForPersistence(sheet);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ffxiv-adventurer-sheet.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!isValidSheetData(parsed)) {
        window.alert("Invalid sheet file.");
        return;
      }
      setSheet(migrateRichTextFields(parsed as LegacySheetData));
    } catch {
      window.alert("Could not parse JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const resetSheet = (): void => {
    const confirmed = window.confirm(
      "Clear all fields and reset the adventurer sheet? This cannot be undone."
    );
    if (!confirmed) {
      return;
    }
    clearSheetData();
    setSheet(createDefaultSheetData());
  };

  const shareSheet = async (): Promise<void> => {
    try {
      const payload = sanitizeSheetForPersistence(sheet);
      const url = buildShareUrl(payload);
      if (url.length > 7800) {
        window.alert(
          "This sheet is very large and may exceed URL limits in some browsers. Consider Export JSON instead."
        );
      }
      await navigator.clipboard.writeText(url);
      setShareState("Share link copied");
    } catch {
      const fallback = buildShareUrl(sanitizeSheetForPersistence(sheet));
      window.prompt("Copy this shareable link:", fallback);
      setShareState("Share link generated");
    }
  };

  return (
    <main className="app-shell">
      <div className="toolbar">
        <div className="toolbar-left">
          <h1 className="tool-title">FFXIV TTRPG Adventurer Sheet</h1>
          <p className="save-state">
            Autosave: {lastSavedAt || "pending..."}
            {shareState ? ` | ${shareState}` : ""}
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => void shareSheet()}>
            Share Link
          </button>
          <button type="button" onClick={exportJson}>
            Export JSON
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <button type="button" onClick={() => setDarkMode((v) => !v)}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button type="button" className="danger" onClick={resetSheet}>
            Reset Sheet
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importJson}
          />
        </div>
      </div>

      <section className="sheet-page">
        <header className="sheet-header">
          <span className="sheet-subtitle">FFXIV TTRPG</span>
          <h2>Adventurer Sheet</h2>
        </header>

        <div className="identity-row">
          <div className="portrait-card">
            <div className="portrait-box">
              {sheet.portrait ? <img src={sheet.portrait} alt="Character portrait" /> : null}
            </div>
            <Field
              label="Portrait URL"
              value={sheet.portrait}
              onChange={(e) => setSheet({ ...sheet, portrait: e.target.value })}
            />
            <Field
              label="LV"
              value={sheet.level}
              onChange={(e) => setSheet({ ...sheet, level: e.target.value })}
              inputClassName="narrow-input"
            />
          </div>

          <Panel className="name-panel">
            <div className="name-grid">
              <Field
                label="Name"
                value={sheet.name}
                onChange={(e) => setSheet({ ...sheet, name: e.target.value })}
              />
              <Field
                label="Race"
                value={sheet.race}
                onChange={(e) => setSheet({ ...sheet, race: e.target.value })}
              />
              <Field
                label="Role"
                value={sheet.role}
                onChange={(e) => setSheet({ ...sheet, role: e.target.value })}
              />
              <Field
                label="Job"
                value={sheet.job}
                onChange={(e) => setSheet({ ...sheet, job: e.target.value })}
              />
            </div>
          </Panel>

          <Panel className="attribute-panel">
            <div className="attributes-grid">
              <div>
                <h3 className="panel-title">Primary Attributes</h3>
                <Field
                  label="STR"
                  value={sheet.primaryAttributes.str}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      primaryAttributes: {
                        ...sheet.primaryAttributes,
                        str: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="DEX"
                  value={sheet.primaryAttributes.dex}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      primaryAttributes: {
                        ...sheet.primaryAttributes,
                        dex: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="VIT"
                  value={sheet.primaryAttributes.vit}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      primaryAttributes: {
                        ...sheet.primaryAttributes,
                        vit: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="INT"
                  value={sheet.primaryAttributes.int}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      primaryAttributes: {
                        ...sheet.primaryAttributes,
                        int: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="MND"
                  value={sheet.primaryAttributes.mnd}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      primaryAttributes: {
                        ...sheet.primaryAttributes,
                        mnd: e.target.value
                      }
                    })
                  }
                />
              </div>
              <div className="secondary-attributes">
                <h3 className="panel-title">Secondary Attributes</h3>
                <Field
                  label="Defense"
                  value={sheet.secondaryAttributes.defense}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      secondaryAttributes: {
                        ...sheet.secondaryAttributes,
                        defense: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="Magic Defense"
                  value={sheet.secondaryAttributes.magicDefense}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      secondaryAttributes: {
                        ...sheet.secondaryAttributes,
                        magicDefense: e.target.value
                      }
                    })
                  }
                />
                <Field
                  label="Vigilance"
                  value={sheet.secondaryAttributes.vigilance}
                  onChange={(e) =>
                    setSheet({
                      ...sheet,
                      secondaryAttributes: {
                        ...sheet.secondaryAttributes,
                        vigilance: e.target.value
                      }
                    })
                  }
                />
                <label className="sheet-field">
                  <span className="sheet-label">Speed</span>
                  <span className="field-with-unit">
                    <input
                      value={sheet.secondaryAttributes.speed}
                      onChange={(e) =>
                        setSheet({
                          ...sheet,
                          secondaryAttributes: {
                            ...sheet.secondaryAttributes,
                            speed: e.target.value
                          }
                        })
                      }
                      className="sheet-input"
                      inputMode="numeric"
                      aria-label="Speed in squares"
                    />
                    <span className="unit-label">squares</span>
                  </span>
                </label>
              </div>
            </div>
            <div className="resource-row">
              <Field
                label="MP Max"
                value={sheet.mpMax}
                onChange={(e) => setSheet({ ...sheet, mpMax: e.target.value })}
              />
              <Field
                label="HP Max"
                value={sheet.hpMax}
                onChange={(e) => setSheet({ ...sheet, hpMax: e.target.value })}
              />
              <Field
                label="Barrier"
                value={sheet.barrier}
                onChange={(e) => setSheet({ ...sheet, barrier: e.target.value })}
              />
            </div>
          </Panel>
        </div>

        <div className="content-row">
          <Panel title="Profile" className="lined-panel">
            <RichTextEditor
              value={sheet.profile}
              onChange={(value) => setSheet({ ...sheet, profile: value })}
              className="profile-area"
              minHeight={530}
              placeholder="Write profile notes..."
            />
          </Panel>

          <Panel title="Traits & Other Effects" className="lined-panel">
            <div className="trait-controls">
              <label className="resource-count-input">
                <span>Marks</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={traitResourceCount}
                  onChange={(e) =>
                    setTraitResourceCount(
                      clampResourceCount(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)
                    )
                  }
                />
              </label>
              <button type="button" onClick={addTrait}>
                Add Trait
              </button>
            </div>
            <div className="trait-list">
              {sheet.traits.map((trait, index) => (
                <article key={`trait-${index}`} className="trait-card">
                  <div className="trait-head">
                    <label className="trait-level">
                      <span>LV</span>
                      <input
                        value={trait.level}
                        onChange={(e) => updateTrait(index, { level: e.target.value })}
                        className="sheet-input"
                        aria-label={`Trait ${index + 1} level`}
                      />
                    </label>
                    <label className="trait-name">
                      <span>Name</span>
                      <input
                        value={trait.name}
                        onChange={(e) => updateTrait(index, { name: e.target.value })}
                        className="sheet-input"
                        aria-label={`Trait ${index + 1} name`}
                      />
                    </label>
                    <label className="trait-type">
                      <span>Type</span>
                      <input
                        value={trait.type}
                        onChange={(e) => updateTrait(index, { type: e.target.value })}
                        className="sheet-input"
                        aria-label={`Trait ${index + 1} type`}
                      />
                    </label>
                    <div className="trait-meta">
                      <div className="trait-resource-marks" aria-label={`Trait ${index + 1} resources`}>
                        {trait.resources.map((isChecked, resourceIndex) => (
                          <button
                            key={`trait-${index}-resource-${resourceIndex}`}
                            type="button"
                            className={`resource-mark ${isChecked ? "checked" : ""}`}
                            onClick={() => toggleTraitResource(index, resourceIndex)}
                            aria-label={`Toggle resource ${resourceIndex + 1} for trait ${index + 1}`}
                          >
                            {isChecked ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="trait-remove"
                        onClick={() => removeTrait(index)}
                        aria-label={`Remove trait ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={trait.description}
                    onChange={(value) => updateTrait(index, { description: value })}
                    className="trait-description"
                    minHeight={88}
                    placeholder="Trait description..."
                  />
                </article>
              ))}
            </div>
            <div className="items-box">
              <div className="item-controls">
                <h3 className="panel-title">Items</h3>
                <button type="button" onClick={addItem}>
                  Add Item
                </button>
              </div>
              <div className="item-table">
                <div className="item-head">Name</div>
                <div className="item-head">Qty</div>
                <div className="item-head">Notes</div>
                <div className="item-head">Action</div>
                {sheet.items.map((item, index) => (
                  <FragmentRow
                    key={`item-${index}`}
                    item={item}
                    onNameChange={(value) => updateItem(index, { name: value })}
                    onQtyChange={(value) => updateItem(index, { quantity: value })}
                    onNotesChange={(value) => updateItem(index, { notes: value })}
                    onRemove={() => removeItem(index)}
                  />
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="sheet-page">
        <header className="sheet-header">
          <span className="sheet-subtitle">FFXIV TTRPG</span>
          <h2>Adventurer Sheet</h2>
        </header>
        <div className="abilities-sections">
          <Panel title="Primary abilities" className="ability-section">
            <div className="ability-controls">
              <label className="resource-count-input">
                <span>Marks</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={abilityResourceCounts.primary}
                  onChange={(e) =>
                    setAbilityResourceCounts((current) => ({
                      ...current,
                      primary: clampResourceCount(
                        Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                      )
                    }))
                  }
                />
              </label>
              <button type="button" onClick={() => addAbility("primary")}>
                Add Ability
              </button>
            </div>
            <div className="ability-list">
              {sheet.abilities.primary.map((ability, index) => (
                <article key={`primary-ability-${index}`} className="ability-card">
                  <div className="ability-head">
                    <label className="ability-name">
                      <span>Name</span>
                      <input
                        value={ability.name}
                        onChange={(e) => updateAbility("primary", index, { name: e.target.value })}
                        className="sheet-input"
                        aria-label={`Primary ability ${index + 1} name`}
                      />
                    </label>
                    <label className="ability-type">
                      <span>Type</span>
                      <input
                        value={ability.type}
                        onChange={(e) => updateAbility("primary", index, { type: e.target.value })}
                        className="sheet-input"
                        aria-label={`Primary ability ${index + 1} type`}
                      />
                    </label>
                    <div className="ability-meta">
                      <div className="ability-resource-marks">
                        {ability.resources.map((isChecked, resourceIndex) => (
                          <button
                            key={`primary-ability-${index}-resource-${resourceIndex}`}
                            type="button"
                            className={`resource-mark ${isChecked ? "checked" : ""}`}
                            onClick={() => toggleAbilityResource("primary", index, resourceIndex)}
                            aria-label={`Toggle primary ability ${index + 1} resource ${resourceIndex + 1}`}
                          >
                            {isChecked ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="ability-remove"
                        onClick={() => removeAbility("primary", index)}
                        aria-label={`Remove primary ability ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={ability.description}
                    onChange={(value) => updateAbility("primary", index, { description: value })}
                    className="ability-description"
                    minHeight={80}
                    placeholder="Primary ability description..."
                  />
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Secondary abilities" className="ability-section">
            <div className="ability-controls">
              <label className="resource-count-input">
                <span>Marks</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={abilityResourceCounts.secondary}
                  onChange={(e) =>
                    setAbilityResourceCounts((current) => ({
                      ...current,
                      secondary: clampResourceCount(
                        Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                      )
                    }))
                  }
                />
              </label>
              <button type="button" onClick={() => addAbility("secondary")}>
                Add Ability
              </button>
            </div>
            <div className="ability-list">
              {sheet.abilities.secondary.map((ability, index) => (
                <article key={`secondary-ability-${index}`} className="ability-card">
                  <div className="ability-head">
                    <label className="ability-name">
                      <span>Name</span>
                      <input
                        value={ability.name}
                        onChange={(e) => updateAbility("secondary", index, { name: e.target.value })}
                        className="sheet-input"
                        aria-label={`Secondary ability ${index + 1} name`}
                      />
                    </label>
                    <label className="ability-type">
                      <span>Type</span>
                      <input
                        value={ability.type}
                        onChange={(e) => updateAbility("secondary", index, { type: e.target.value })}
                        className="sheet-input"
                        aria-label={`Secondary ability ${index + 1} type`}
                      />
                    </label>
                    <div className="ability-meta">
                      <div className="ability-resource-marks">
                        {ability.resources.map((isChecked, resourceIndex) => (
                          <button
                            key={`secondary-ability-${index}-resource-${resourceIndex}`}
                            type="button"
                            className={`resource-mark ${isChecked ? "checked" : ""}`}
                            onClick={() => toggleAbilityResource("secondary", index, resourceIndex)}
                            aria-label={`Toggle secondary ability ${index + 1} resource ${resourceIndex + 1}`}
                          >
                            {isChecked ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="ability-remove"
                        onClick={() => removeAbility("secondary", index)}
                        aria-label={`Remove secondary ability ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={ability.description}
                    onChange={(value) => updateAbility("secondary", index, { description: value })}
                    className="ability-description"
                    minHeight={80}
                    placeholder="Secondary ability description..."
                  />
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Instant abilities" className="ability-section">
            <div className="ability-controls">
              <label className="resource-count-input">
                <span>Marks</span>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={abilityResourceCounts.instant}
                  onChange={(e) =>
                    setAbilityResourceCounts((current) => ({
                      ...current,
                      instant: clampResourceCount(
                        Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber
                      )
                    }))
                  }
                />
              </label>
              <button type="button" onClick={() => addAbility("instant")}>
                Add Ability
              </button>
            </div>
            <div className="ability-list">
              {sheet.abilities.instant.map((ability, index) => (
                <article key={`instant-ability-${index}`} className="ability-card">
                  <div className="ability-head">
                    <label className="ability-name">
                      <span>Name</span>
                      <input
                        value={ability.name}
                        onChange={(e) => updateAbility("instant", index, { name: e.target.value })}
                        className="sheet-input"
                        aria-label={`Instant ability ${index + 1} name`}
                      />
                    </label>
                    <label className="ability-type">
                      <span>Type</span>
                      <input
                        value={ability.type}
                        onChange={(e) => updateAbility("instant", index, { type: e.target.value })}
                        className="sheet-input"
                        aria-label={`Instant ability ${index + 1} type`}
                      />
                    </label>
                    <div className="ability-meta">
                      <div className="ability-resource-marks">
                        {ability.resources.map((isChecked, resourceIndex) => (
                          <button
                            key={`instant-ability-${index}-resource-${resourceIndex}`}
                            type="button"
                            className={`resource-mark ${isChecked ? "checked" : ""}`}
                            onClick={() => toggleAbilityResource("instant", index, resourceIndex)}
                            aria-label={`Toggle instant ability ${index + 1} resource ${resourceIndex + 1}`}
                          >
                            {isChecked ? "✓" : ""}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="ability-remove"
                        onClick={() => removeAbility("instant", index)}
                        aria-label={`Remove instant ability ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={ability.description}
                    onChange={(value) => updateAbility("instant", index, { description: value })}
                    className="ability-description"
                    minHeight={80}
                    placeholder="Instant ability description..."
                  />
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
};

interface FragmentRowProps {
  item: ItemRow;
  onNameChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onRemove: () => void;
}

const FragmentRow = ({
  item,
  onNameChange,
  onQtyChange,
  onNotesChange,
  onRemove
}: FragmentRowProps): JSX.Element => (
  <>
    <input
      aria-label="Item name"
      className="sheet-input table-input"
      value={item.name}
      onChange={(e) => onNameChange(e.target.value)}
    />
    <input
      aria-label="Item quantity"
      className="sheet-input table-input"
      value={item.quantity}
      onChange={(e) => onQtyChange(e.target.value)}
      inputMode="numeric"
    />
    <input
      aria-label="Item notes"
      className="sheet-input table-input"
      value={item.notes}
      onChange={(e) => onNotesChange(e.target.value)}
    />
    <div className="table-input item-action-cell">
      <button type="button" className="item-remove" onClick={onRemove} aria-label="Remove item">
        Remove
      </button>
    </div>
  </>
);

export default App;
