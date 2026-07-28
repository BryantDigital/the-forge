import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../lib/attendance.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: compiledModule,
  exports: compiledModule.exports,
});
const { isFirstTimeAtEvent } = compiledModule.exports;

test("marks a child as first-time when no earlier checked-in event exists", () => {
  assert.equal(isFirstTimeAtEvent(2_000, []), true);
  assert.equal(isFirstTimeAtEvent(2_000, [2_000, 3_000]), true);
});

test("removes first-time status when an earlier checked-in event exists", () => {
  assert.equal(isFirstTimeAtEvent(2_000, [1_000]), false);
});
