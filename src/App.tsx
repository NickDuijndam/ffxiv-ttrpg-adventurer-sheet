import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Field } from "./components/form/Field";
import { RichTextEditor } from "./components/form/RichTextEditor";
import { Panel } from "./components/layout/Panel";
import { CharacterSheetData, ItemRow, createDefaultSheetData } from "./types/sheet";
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

const toRichTextHtml = (value: string): string => {
  if (!value) {
    return "";
  }
  if (containsHtml(value)) {
    return value;
  }
  return escapeHtml(value).replace(/\n/g, "<br>");
};

const migrateRichTextFields = (data: CharacterSheetData): CharacterSheetData => ({
  ...data,
  profile: toRichTextHtml(data.profile),
  traits: toRichTextHtml(data.traits),
  abilities: toRichTextHtml(data.abilities)
});

const App = (): JSX.Element => {
  const loadedData = useMemo(() => {
    const sharedData = readSharedSheetFromUrl();
    if (sharedData && isValidSheetData(sharedData)) {
      return migrateRichTextFields(sharedData);
    }
    const storedData = loadSheetData();
    return storedData && isValidSheetData(storedData) ? migrateRichTextFields(storedData) : null;
  }, []);
  const [sheet, setSheet] = useState<CharacterSheetData>(
    loadedData && isValidSheetData(loadedData) ? loadedData : createDefaultSheetData()
  );
  const [darkMode, setDarkMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [shareState, setShareState] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveSheetData(sheet);
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

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify(sheet, null, 2)], { type: "application/json" });
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
      setSheet(migrateRichTextFields(parsed));
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
      const url = buildShareUrl(sheet);
      if (url.length > 7800) {
        window.alert(
          "This sheet is very large and may exceed URL limits in some browsers. Consider Export JSON instead."
        );
      }
      await navigator.clipboard.writeText(url);
      setShareState("Share link copied");
    } catch {
      const fallback = buildShareUrl(sheet);
      window.prompt("Copy this shareable link:", fallback);
      setShareState("Share link generated");
    }
  };

  return (
    <main className="app-shell">
      <div className="toolbar no-print">
        <div className="toolbar-left">
          <h1 className="tool-title">FFXIV TTRPG Adventurer Sheet</h1>
          <p className="save-state">
            Autosave: {lastSavedAt || "pending..."}
            {shareState ? ` | ${shareState}` : ""}
          </p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
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
            <RichTextEditor
              value={sheet.traits}
              onChange={(value) => setSheet({ ...sheet, traits: value })}
              className="trait-area"
              minHeight={360}
              placeholder="Write traits and effects..."
            />
            <div className="items-box">
              <h3 className="panel-title">Items</h3>
              <div className="item-table">
                <div className="item-head">Name</div>
                <div className="item-head">Qty</div>
                <div className="item-head">Notes</div>
                {sheet.items.map((item, index) => (
                  <FragmentRow
                    key={`item-${index}`}
                    item={item}
                    onNameChange={(value) => updateItem(index, { name: value })}
                    onQtyChange={(value) => updateItem(index, { quantity: value })}
                    onNotesChange={(value) => updateItem(index, { notes: value })}
                  />
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section className="sheet-page page-break">
        <header className="sheet-header">
          <span className="sheet-subtitle">FFXIV TTRPG</span>
          <h2>Adventurer Sheet</h2>
        </header>
        <Panel title="Abilities" className="abilities-panel lined-panel">
          <RichTextEditor
            value={sheet.abilities}
            onChange={(value) => setSheet({ ...sheet, abilities: value })}
            className="abilities-textarea"
            minHeight={820}
            placeholder="Write abilities..."
          />
        </Panel>
      </section>
    </main>
  );
};

interface FragmentRowProps {
  item: ItemRow;
  onNameChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

const FragmentRow = ({
  item,
  onNameChange,
  onQtyChange,
  onNotesChange
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
  </>
);

export default App;
