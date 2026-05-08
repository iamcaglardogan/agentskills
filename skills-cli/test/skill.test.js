import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readSkill } from "../src/skill.js";

async function withTempSkill(content, fn) {
  const dir = await mkdtemp(join(tmpdir(), "skills-cli-test-"));
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), content, "utf8");
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const VALID = `---
name: pdf-processing
description: Extract text and tables from PDFs.
license: Apache-2.0
metadata:
  author: example
  version: "1.0"
---

# Body
`;

test("reads valid frontmatter", async () => {
  await withTempSkill(VALID, async (dir) => {
    const props = await readSkill(dir);
    assert.equal(props.name, "pdf-processing");
    assert.equal(props.description, "Extract text and tables from PDFs.");
    assert.equal(props.license, "Apache-2.0");
    assert.deepEqual(props.metadata, { author: "example", version: "1.0" });
  });
});

test("rejects missing SKILL.md", async () => {
  const dir = await mkdtemp(join(tmpdir(), "skills-cli-test-"));
  try {
    await assert.rejects(() => readSkill(dir), /SKILL\.md not found/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects missing frontmatter", async () => {
  await withTempSkill("# Just a body\n", async (dir) => {
    await assert.rejects(() => readSkill(dir), /missing YAML frontmatter/);
  });
});

test("rejects missing name", async () => {
  const content = `---
description: missing name
---
body
`;
  await withTempSkill(content, async (dir) => {
    await assert.rejects(() => readSkill(dir), /missing required "name"/);
  });
});

test("rejects invalid name", async () => {
  const content = `---
name: PDF-Processing
description: bad name
---
body
`;
  await withTempSkill(content, async (dir) => {
    await assert.rejects(() => readSkill(dir), /invalid name/);
  });
});

test("rejects missing description", async () => {
  const content = `---
name: pdf-processing
---
body
`;
  await withTempSkill(content, async (dir) => {
    await assert.rejects(() => readSkill(dir), /missing required "description"/);
  });
});
