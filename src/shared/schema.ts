import { z } from "zod";
export const languageSchema = z.enum(["darija", "ar", "fr", "en"]);
export const sceneSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  type: z.enum(["hook", "image", "facts", "comparison", "closing"]),
  title: z.string().trim().min(1).max(100),
  narration: z.string().trim().min(1).max(900),
  points: z.array(z.string().max(100)).max(3).default([]),
  imageIndex: z.number().int().min(0).max(11).nullable().default(null),
});
export const storyboardSchema = z
  .object({
    title: z.string().min(1).max(120),
    scenes: z.array(sceneSchema).min(2).max(12),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.scenes.map((s) => s.id)).size !== v.scenes.length)
      ctx.addIssue({ code: "custom", message: "Scene IDs must be unique" });
  });
export const createSchema = z.object({
  url: z.string().url().max(2048),
  language: languageSchema.default("darija"),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(60),
  brand: z.string().trim().min(1).max(48).default("My Studio"),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#e6533c"),
  autoRender: z.boolean().default(true),
  demo: z.boolean().default(false),
});
export type CreateInput = z.infer<typeof createSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Word = { text: string; start: number; end: number };
export type VideoScene = Scene & {
  durationFrames: number;
  image?: string;
  audio?: string;
  words: Word[];
};
export type VideoProps = {
  brand: string;
  accent: string;
  language: string;
  scenes: VideoScene[];
};
export type Source = {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
};
export type Status =
  | "queued"
  | "extracting"
  | "writing"
  | "review"
  | "voicing"
  | "rendering"
  | "completed"
  | "failed";
export type Project = {
  id: string;
  input: CreateInput;
  status: Status;
  progress: number;
  createdAt: string;
  updatedAt: string;
  revision: number;
  error?: string;
  warnings: string[];
  source?: Source;
  storyboard?: Storyboard;
  video?: VideoProps;
  output?: string;
  thumbnail?: string;
  subtitles?: string;
};
export const FPS = 30;
export const totalFrames = (props: VideoProps) =>
  props.scenes.reduce((n, s) => n + s.durationFrames, 0);
export const sampleVideo: VideoProps = {
  brand: "HERMES STUDIO",
  accent: "#e6533c",
  language: "en",
  scenes: [
    {
      id: "hook",
      type: "hook",
      title: "A great story starts with one link.",
      narration: "Turn a page into a story.",
      points: ["Your ideas. In motion."],
      imageIndex: null,
      durationFrames: 150,
      words: [],
    },
    {
      id: "facts",
      type: "facts",
      title: "Built for your next big idea.",
      narration: "Research. Write. Animate.",
      points: ["Read the page", "Find the story", "Make it move"],
      imageIndex: null,
      durationFrames: 180,
      words: [],
    },
    {
      id: "closing",
      type: "closing",
      title: "From URL to the spotlight.",
      narration: "Made with Hermes Video Studio.",
      points: ["1080 × 1920", "Made to be shared"],
      imageIndex: null,
      durationFrames: 150,
      words: [],
    },
  ],
};
