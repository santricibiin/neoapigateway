/**
 * Self-check gate model upstream (bandel + 9router). Jalankan: npx tsx scripts/check-model-gate.ts
 * Tanpa framework, tanpa DB — hanya menguji helper murni.
 */
import assert from "node:assert/strict";
import {
  filterModelListPayload,
  modelFromRequestBody,
  parseDisabledIds,
  resolveModelTarget,
  routerModelAllowed,
  type ModelGateConfig,
} from "../src/lib/model-gate";
import { groupByProvider, routerProviderOf } from "../src/lib/router-upstream";

// parseDisabledIds
assert.equal(parseDisabledIds(null).size, 0, "null -> kosong");
assert.equal(parseDisabledIds("bukan json").size, 0, "JSON rusak -> kosong");
assert.equal(parseDisabledIds("{}").size, 0, "objek -> kosong");
assert.deepEqual([...parseDisabledIds('["a","b",1,null]')], ["a", "b"], "non-string dibuang");

// filterModelListPayload
const list = { object: "list", data: [{ id: "gpt-5" }, { id: "claude-4" }, { id: "auto" }] };
const filtered = filterModelListPayload(list, new Set(["claude-4"])) as typeof list;
assert.deepEqual(filtered.data.map((m) => m.id), ["gpt-5", "auto"], "model diblokir hilang");
assert.equal(filtered.object, "list", "field lain utuh");
assert.doesNotThrow(() => filterModelListPayload({ error: "x" }, new Set(["a"])), "payload tanpa data aman");
assert.doesNotThrow(() => filterModelListPayload(null, new Set(["a"])), "payload null aman");

// modelFromRequestBody
assert.equal(modelFromRequestBody('{"model":"claude-4"}'), "claude-4");
assert.equal(modelFromRequestBody('{"model":""}'), null, "string kosong -> null");
assert.equal(modelFromRequestBody('{"model":123}'), null, "non-string -> null");
assert.equal(modelFromRequestBody("{"), null, "JSON rusak -> null");
assert.equal(modelFromRequestBody("{}"), null, "tanpa field model -> null");

// routerProviderOf
assert.equal(routerProviderOf("cf/@cf/meta/llama-3.2-1b-instruct"), "cf", "prefix sebelum slash pertama");
assert.equal(routerProviderOf("kr/claude-sonnet-4.5"), "kr");
assert.equal(routerProviderOf("deepseek-v4-flash"), null, "tanpa slash -> null (model bandel)");
assert.equal(routerProviderOf("/leading"), null, "slash di awal -> null");
assert.equal(routerProviderOf("trailing/"), null, "slash di akhir -> null");
assert.equal(routerProviderOf(null), null);

// groupByProvider
const groups = groupByProvider([
  { id: "kr/b" },
  { id: "cf/x" },
  { id: "kr/a" },
  { id: "tanpa-prefix", owned_by: "bp" },
]);
assert.deepEqual(groups.map((g) => g.provider), ["bp", "cf", "kr"], "urut nama, fallback owned_by");
assert.deepEqual(groups[2].models.map((m) => m.id), ["kr/a", "kr/b"], "model dalam grup terurut");

// resolveModelTarget + routerModelAllowed
const config = (over: Partial<ModelGateConfig> = {}): ModelGateConfig => ({
  disabled: new Set(),
  routerEnabled: true,
  routerProviders: new Set(["cf"]),
  ...over,
});

assert.equal(resolveModelTarget("deepseek-v4-flash", config()).kind, "bandel", "tanpa prefix -> bandel");
assert.equal(resolveModelTarget(null, config()).kind, "bandel", "tanpa model -> bandel");
assert.equal(resolveModelTarget("cf/x", config()).kind, "router", "provider diizinkan -> router");
assert.equal(resolveModelTarget("kr/x", config()).kind, "blocked", "provider di luar allowlist -> blocked");
assert.equal(
  resolveModelTarget("cf/x", config({ routerEnabled: false })).kind,
  "blocked",
  "master switch off -> blocked meski provider on"
);
assert.equal(
  resolveModelTarget("cf/x", config({ disabled: new Set(["cf/x"]) })).kind,
  "blocked",
  "model diblokir individual -> blocked"
);
assert.equal(
  resolveModelTarget("deepseek-v4-flash", config({ disabled: new Set(["deepseek-v4-flash"]) })).kind,
  "blocked",
  "model bandel diblokir -> blocked"
);
assert.equal(routerModelAllowed("cf/x", config()), true);
assert.equal(routerModelAllowed("cf/x", config({ routerProviders: new Set() })), false, "allowlist kosong -> tolak");

console.log("model-gate: semua check lolos");
