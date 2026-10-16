import { describe, expect, it } from "vitest";
import { hotp } from "./totp";

describe("TOTP de referência", () => {
  it("reproduz os vetores da RFC 6238 (SHA-1, 8 dígitos)", () => {
    const segredo = Buffer.from("12345678901234567890", "ascii");
    expect(hotp(segredo, Math.floor(59 / 30), 8)).toBe("94287082");
    expect(hotp(segredo, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(hotp(segredo, Math.floor(1234567890 / 30), 8)).toBe("89005924");
  });
});
