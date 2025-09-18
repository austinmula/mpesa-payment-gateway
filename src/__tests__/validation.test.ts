import {
  validatePhoneNumber,
  formatPhoneNumber,
  validateAmount,
} from "../utils/validation";

describe("Validation Utilities", () => {
  describe("validatePhoneNumber", () => {
    test("should validate correct Kenyan phone numbers", () => {
      expect(validatePhoneNumber("254712345678")).toBe(true);
      expect(validatePhoneNumber("0712345678")).toBe(true);
      expect(validatePhoneNumber("254701234567")).toBe(true);
    });

    test("should reject invalid phone numbers", () => {
      expect(validatePhoneNumber("123456789")).toBe(false);
      expect(validatePhoneNumber("254812345678")).toBe(false);
      expect(validatePhoneNumber("0812345678")).toBe(false);
    });
  });

  describe("formatPhoneNumber", () => {
    test("should format phone numbers correctly", () => {
      expect(formatPhoneNumber("0712345678")).toBe("254712345678");
      expect(formatPhoneNumber("254712345678")).toBe("254712345678");
      expect(formatPhoneNumber("0701234567")).toBe("254701234567");
    });

    test("should throw error for invalid format", () => {
      expect(() => formatPhoneNumber("123456789")).toThrow(
        "Invalid phone number format"
      );
    });
  });

  describe("validateAmount", () => {
    test("should validate correct amounts", () => {
      expect(validateAmount(1)).toBe(true);
      expect(validateAmount(100.5)).toBe(true);
      expect(validateAmount(70000)).toBe(true);
    });

    test("should reject invalid amounts", () => {
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(-10)).toBe(false);
      expect(validateAmount(70001)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
    });
  });
});
