import { useState } from "react";
import { Check, House, Building2, ShieldCheck } from "lucide-react";
import { ASSETS } from "./model";
import type { Asset, AssetId, AssetStatus, Household } from "./model";
import { Badge, Dialog } from "./components";
import { ASSET_ICONS } from "./icons";

export function HouseholdEditor({
  household,
  onApply,
  onClose,
}: {
  household: Household;
  onApply: (household: Household) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(household));
  function updateAsset(id: AssetId, update: Partial<Asset>) {
    setDraft((previous) => ({
      ...previous,
      assets: {
        ...previous.assets,
        [id]: { ...previous.assets[id], ...update },
      },
    }));
  }
  return (
    <Dialog
      title="Your household picture"
      onClose={onClose}
      className="household-dialog"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply(draft);
          onClose();
        }}
      >
        <div className="dialog-body">
          <div className="editor-intro">
            <span>
              <ShieldCheck size={17} />
              Meter readings stay unchanged
            </span>
            <Badge tone="amber">Demo household</Badge>
          </div>
          <div className="household-fields">
            <label>
              Building type
              <select
                aria-label="Building type"
                value={draft.building}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    building: event.target.value as Household["building"],
                  })
                }
              >
                <option value="single">Single-family home</option>
                <option value="multi">Multi-family building</option>
              </select>
            </label>
            <label>
              Meter covers
              <select
                aria-label="Meter covers"
                value={draft.meter}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    meter: event.target.value as Household["meter"],
                  })
                }
              >
                <option value="dwelling">One dwelling</option>
                <option value="building">Whole building</option>
                <option value="communal">Communal services</option>
              </select>
            </label>
            <label>
              Your role
              <select
                aria-label="Your role"
                value={draft.role}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    role: event.target.value as Household["role"],
                  })
                }
              >
                <option value="owner">Owner</option>
                <option value="resident">Resident / tenant</option>
                <option value="manager">Building manager</option>
              </select>
            </label>
          </div>
          <div className="section-heading">
            <h3>
              {draft.building === "single" ? (
                <House size={18} />
              ) : (
                <Building2 size={18} />
              )}
              Equipment at this meter
            </h3>
            <span className="muted">Any combination</span>
          </div>
          <div className="asset-editor-list">
            {ASSETS.map((definition) => {
              const asset = draft.assets[definition.id];
              const Icon = ASSET_ICONS[definition.id];
              const present =
                asset.status === "confirmed" || asset.status === "inferred";
              return (
                <div className="asset-editor-row" key={definition.id}>
                  <div className="asset-editor-heading">
                    <span className={`asset-icon ${present ? "present" : ""}`}>
                      <Icon size={21} />
                    </span>
                    <div>
                      <strong>{definition.name}</strong>
                      <small>{definition.flexibility}</small>
                    </div>
                    <select
                      aria-label={`${definition.name} status`}
                      value={asset.status}
                      onChange={(event) =>
                        updateAsset(definition.id, {
                          status: event.target.value as AssetStatus,
                        })
                      }
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="inferred">To confirm</option>
                      <option value="absent">Not installed</option>
                      <option value="unknown">Not sure</option>
                    </select>
                  </div>
                  {present && (
                    <div className="asset-editor-settings">
                      <label className="capacity-field">
                        <input
                          aria-label={`${definition.name} capacity`}
                          type="number"
                          min={0.1}
                          max={50}
                          step={0.1}
                          required
                          value={asset.capacity}
                          onChange={(event) =>
                            updateAsset(definition.id, {
                              capacity: Number(event.target.value),
                            })
                          }
                        />
                        <span>{definition.unit}</span>
                      </label>
                      {draft.building === "multi" && (
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={asset.shared}
                            onChange={(event) =>
                              updateAsset(definition.id, {
                                shared: event.target.checked,
                              })
                            }
                          />
                          Shared equipment
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="fine-print">
            Capacities are illustrative until you confirm them. Available
            flexibility also depends on equipment state, schedules, comfort and
            permission to act. Import readings do not establish PV generation or
            battery charge.
          </p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            <Check size={17} />
            Apply household changes
          </button>
        </div>
      </form>
    </Dialog>
  );
}
