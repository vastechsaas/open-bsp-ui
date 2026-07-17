import test from "node:test";
import assert from "node:assert/strict";
import {
  clampDataTablePage,
  getDataTablePageCount,
} from "../src/utils/DataTableUtils.ts";

void test("data table pagination calculates pages consistently", () => {
  assert.equal(getDataTablePageCount(0, 10), 1);
  assert.equal(getDataTablePageCount(10, 10), 1);
  assert.equal(getDataTablePageCount(11, 10), 2);
});

void test("data table pagination clamps an invalid current page", () => {
  assert.equal(clampDataTablePage(0, 35, 10), 1);
  assert.equal(clampDataTablePage(8, 35, 10), 4);
});
