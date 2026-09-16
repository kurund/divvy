import { beforeEach, describe, expect, it } from "vitest";
import { clearIdentity, getIdentity, setIdentity } from "./identity";

describe("identity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no identity is set", () => {
    expect(getIdentity("group-a")).toBeNull();
  });

  it("stores and retrieves per-group identities", () => {
    setIdentity("group-a", "member-1");
    setIdentity("group-b", "member-2");
    expect(getIdentity("group-a")).toBe("member-1");
    expect(getIdentity("group-b")).toBe("member-2");
  });

  it("overwrites an existing identity for the same group", () => {
    setIdentity("group-a", "member-1");
    setIdentity("group-a", "member-x");
    expect(getIdentity("group-a")).toBe("member-x");
  });

  it("clears only the specified group", () => {
    setIdentity("group-a", "member-1");
    setIdentity("group-b", "member-2");
    clearIdentity("group-a");
    expect(getIdentity("group-a")).toBeNull();
    expect(getIdentity("group-b")).toBe("member-2");
  });

  it("tolerates a corrupt storage value", () => {
    localStorage.setItem("divvy:identity:v1", "not-json");
    expect(getIdentity("group-a")).toBeNull();
  });
});
