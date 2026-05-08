import { strict as assert } from "node:assert";
import { test } from "node:test";

import { parseSource } from "../src/source.js";

test("parses owner/repo", () => {
  assert.deepEqual(parseSource("anthropics/skills"), {
    owner: "anthropics",
    repo: "skills",
    subpath: "",
    ref: undefined,
  });
});

test("parses owner/repo#ref", () => {
  assert.deepEqual(parseSource("anthropics/skills#v1.0.0"), {
    owner: "anthropics",
    repo: "skills",
    subpath: "",
    ref: "v1.0.0",
  });
});

test("parses owner/repo with subpath", () => {
  assert.deepEqual(parseSource("anthropics/skills/document-skills/pdf"), {
    owner: "anthropics",
    repo: "skills",
    subpath: "document-skills/pdf",
    ref: undefined,
  });
});

test("parses owner/repo with subpath and ref", () => {
  assert.deepEqual(parseSource("anthropics/skills/document-skills/pdf#main"), {
    owner: "anthropics",
    repo: "skills",
    subpath: "document-skills/pdf",
    ref: "main",
  });
});

test("rejects empty input", () => {
  assert.throws(() => parseSource(""), /source is required/);
});

test("rejects missing repo", () => {
  assert.throws(() => parseSource("anthropics"), /expected "owner\/repo"/);
});

test("rejects empty ref after #", () => {
  assert.throws(() => parseSource("anthropics/skills#"), /empty ref after "#"/);
});

test("rejects invalid owner", () => {
  assert.throws(() => parseSource("-bad/skills"), /invalid GitHub owner/);
});
