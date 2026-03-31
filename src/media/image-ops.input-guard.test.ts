import { describe, expect, it } from "vitest";
import { getImageMetadata, MAX_IMAGE_INPUT_PIXELS, resizeToJpeg } from "./image-ops.js";

function createOversizedPngBuffer(params: { width: number; height: number }): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLength = Buffer.from([0x00, 0x00, 0x00, 0x0d]);
  const ihdrType = Buffer.from("IHDR", "ascii");
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(params.width, 0);
  ihdrData.writeUInt32BE(params.height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  const ihdrCrc = Buffer.alloc(4);
  const iend = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return Buffer.concat([signature, ihdrLength, ihdrType, ihdrData, ihdrCrc, iend]);
}

describe("image input pixel guard", () => {
  const oversizedPng = createOversizedPngBuffer({ width: 8_000, height: 4_000 });

  it("returns null metadata for images above the pixel limit", async () => {
    await expect(getImageMetadata(oversizedPng)).resolves.toBeNull();
    expect(8_000 * 4_000).toBeGreaterThan(MAX_IMAGE_INPUT_PIXELS);
  });

  it("rejects oversized images before resize work starts", async () => {
    await expect(
      resizeToJpeg({
        buffer: oversizedPng,
        maxSide: 2_048,
        quality: 80,
      }),
    ).rejects.toThrow(/pixel input limit/i);
  });
});
