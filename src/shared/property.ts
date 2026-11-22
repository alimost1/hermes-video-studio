import { z } from "zod";

const caption = z.string().trim().max(90).default("");
const photo = z.object({
  imageIndex: z.number().int().min(0).max(23),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
});
export const propertySchema = z.object({
  status: caption,
  reference: caption,
  title: z.string().trim().min(1).max(80),
  location: caption,
  cover: photo,
  close: photo.optional(),
  facts: z
    .array(z.tuple([z.string().max(40), z.string().max(50)]))
    .max(2)
    .default([]),
  chapters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        upper: photo,
        lower: photo,
        upperCaption: caption,
        lowerCaption: caption,
      }),
    )
    .min(1)
    .max(6),
  agency: caption,
  priceLabel: caption,
  price: caption,
  invite: caption,
  phone: caption,
  website: caption,
});
export type PropertyBoard = z.infer<typeof propertySchema>;
export function parsePropertyBoard(value: unknown, imageCount: number) {
  const board = propertySchema.parse(value);
  const photos = [
    board.cover,
    board.close ?? board.cover,
    ...board.chapters.flatMap((c) => [c.upper, c.lower]),
  ];
  if (photos.some((p) => p.imageIndex >= imageCount))
    throw Error("A property photo number is outside the listing gallery.");
  return board;
}
export const propertySeconds = (count: number) => (79 + 28 * count) / 10;
