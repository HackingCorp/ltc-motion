// @vitest-environment node
import { describe, expect, it } from "vitest";
import { tokensToVariables } from "./tokensToVariables";
import type { FigmaVariablesResult } from "./client";

const VARS: FigmaVariablesResult = {
  variables: {
    "VariableID:1:1": {
      name: "Blue/500",
      key: "kblue",
      resolvedType: "COLOR",
      valuesByMode: { m1: { r: 0, g: 0.4, b: 1, a: 1 } },
      variableCollectionId: "c1",
    },
    "VariableID:1:2": {
      name: "button/bg",
      key: "kbtn",
      resolvedType: "COLOR",
      valuesByMode: { m1: { type: "VARIABLE_ALIAS", id: "VariableID:1:1" } },
      variableCollectionId: "c1",
    },
    "VariableID:1:3": {
      name: "radius/md",
      key: "krad",
      resolvedType: "FLOAT",
      valuesByMode: { m1: 8 },
      variableCollectionId: "c1",
    },
  },
  variableCollections: {
    c1: { defaultModeId: "m1", modes: [{ modeId: "m1", name: "Light" }] },
  },
};

const SOURCE = { fileKey: "FILE", version: "7" };

describe("tokensToVariables", () => {
  it("maps color variables to composition color entries with hex defaults", () => {
    const out = tokensToVariables(VARS, SOURCE);
    const blue = out.entries.find((e) => e.id === "figma:Blue/500");
    expect(blue).toMatchObject({ type: "color", label: "Blue/500", default: "#0066FF" });
  });

  it("resolves alias chains to the leaf value and records the chain on the binding", () => {
    const out = tokensToVariables(VARS, SOURCE);
    const btn = out.entries.find((e) => e.id === "figma:button/bg");
    expect(btn?.default).toBe("#0066FF");
    const binding = out.bindings.find((b) => b.figmaId === "VariableID:1:2");
    expect(binding?.aliasChain).toEqual(["VariableID:1:2", "VariableID:1:1"]);
    expect(binding?.compositionVariableId).toBe("figma:button/bg");
  });

  it("maps FLOAT to number entries and stamps provenance on every binding", () => {
    const out = tokensToVariables(VARS, SOURCE);
    const rad = out.entries.find((e) => e.id === "figma:radius/md");
    expect(rad).toMatchObject({ type: "number", default: 8 });
    for (const b of out.bindings) {
      expect(b.sourceFileKey).toBe("FILE");
      expect(b.version).toBe("7");
      expect(b.kind).toBe("binding");
    }
  });

  it("emits an alpha color as rgba()", () => {
    const out = tokensToVariables(
      {
        variables: {
          "VariableID:2:1": {
            name: "overlay",
            resolvedType: "COLOR",
            valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 0.5 } },
          },
        },
        variableCollections: {},
      },
      SOURCE,
    );
    expect(out.entries[0]?.default).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("survives alias cycles without hanging and skips the unresolvable variable", () => {
    const out = tokensToVariables(
      {
        variables: {
          "VariableID:3:1": {
            name: "a",
            resolvedType: "COLOR",
            valuesByMode: { m1: { type: "VARIABLE_ALIAS", id: "VariableID:3:2" } },
          },
          "VariableID:3:2": {
            name: "b",
            resolvedType: "COLOR",
            valuesByMode: { m1: { type: "VARIABLE_ALIAS", id: "VariableID:3:1" } },
          },
        },
        variableCollections: {},
      },
      SOURCE,
    );
    expect(out.entries).toEqual([]);
  });

  it("writes a sidecar with every token including modes", () => {
    const out = tokensToVariables(VARS, SOURCE);
    expect(out.sidecar.source).toEqual(SOURCE);
    const blue = out.sidecar.tokens.find((t) => t.name === "Blue/500");
    expect(blue).toMatchObject({ figmaId: "VariableID:1:1", key: "kblue", type: "color" });
  });
});
