---
name: creatin-motion
description: Create vertical motion-graphics promos in the Creatin SEO Web style, with a cream-and-lime kinetic hook, a forest-green brand reveal, floating interface cards, and a held call to action. Use for requests to reuse the Creatin or Finqube-inspired video style, adapt the previous Pinterest-inspired ad to another brand, storyboard a cut, or render a finished vertical MP4.
---

# Creatin Motion

Build the story around one action a customer takes. Carry one recognizable object from the opening problem, through the demonstration, to the closing invitation. Use the brief and renderer below to reproduce the original movement.

## Adapt the brief

1. Take the product, audience, language, and desired action from the request. Use the original Creatin SEO Web brief for a repeat of the original campaign. When the subject is missing and cannot be inferred, ask which product the video should feature.
2. Read [the motion guide](references/motion.md) to choose the beats. Use 45 seconds for a full demonstration or the 15-second cut for one benefit. Match other requested lengths with a custom edit.
3. Copy [the example brief](references/creatin-brief.json) into the project workspace. Rewrite the example-specific strings for the new campaign, including search chips, card headings, sample name, desktop and mobile copy, small labels, and the closing button. Write the opening as a short setup followed by a question with a one-to-three-word highlighted phrase.
4. Put one concrete example on screen. Show a query becoming a result, a feature becoming a useful screen, or a product becoming a booking. Use supplied artwork or a product screenshot for the demonstration. Set optional `artwork` and `logo` to local image paths relative to the brief. Use the logo image when supplied. The renderer uses a typographic initial for new brands without artwork for the logo.
5. For a non-web product, adapt the search field into a lookup or discovery step and the preview into the product's actual interface or a clearly described illustrative mockup. If the visual metaphor does not fit, copy `assets/scenes.cjs` and the renderer into the project and replace those scene functions. Keep the timing and easing. Use product claims and offers supported by the brief.

## Render

Run commands from the project, using the absolute path of this skill directory in `SKILL_DIR`. The bundled renderer uses Node 18.12+ with `@napi-rs/canvas`, FFmpeg with libx264, and Python with NumPy and SciPy for the original soundtrack. The Work runtime supplies the dependencies. The scene sheet and silent cuts only need their respective drawing and encoding dependencies.

```sh
node "$SKILL_DIR/scripts/render.cjs" brief.json review.jpg --sheet
node "$SKILL_DIR/scripts/render.cjs" brief.json promo.mp4
```

Apply `--seconds 15` to both commands for the short edit. Add `--silent` for a silent MP4. Add `--progress` to print `progress 0.0–1.0` lines while encoding (the Hermes Video Studio worker uses this). The original score ships prebuilt as `assets/score.m4a`; `scripts/score.py` regenerates it and is used only if that file is missing. For a script or storyboard request, deliver only the requested format. For a video request, render and deliver the playable MP4.

## Optional phone picker

On the phone, the second half of the mobile scene can show a picker instead of the plain page: the phone moves forward, a panel opens, the middle tile lights up and a confirmation appears. Add these optional brief fields to enable it (without `pickTitle` the phone only shows the page):

- `pickLabel`: small label above the title (defaults to `galleryTitle`), `pickTitle`: the panel heading ("Pick a date"), `pickNote`: a sub-label ("December").
- `pick1`, `pick2`, `pick3`: tiles written as `small|big`, for example `Fri|4`, `Sat|5`, `Sun|6` or `Small|250g`. The middle tile, `pick2`, is the one selected.
- `pickConfirm`: the dark confirmation pill ("Sat 5 Dec selected"). Pick the kind of choice that fits the business (dates, sizes, plans, rooms) and never invent prices or availability.

`references/zest-walks-brief.json` is a complete example with artwork (an illustrated orange stall, `assets/sample-stall.jpg`); `artwork` is resolved relative to the brief file.

## Review

Inspect the sheet at phone size. Check that the highlighted words, the brand, the demonstration and the closing action are readable. Watch the opening change, a card transition, and the last few seconds of the actual encode. Check accented characters and any supplied logo against both background colors. Verify duration, frame size and streams with `ffprobe`. Describe any illustrative product screens or substitute mark when delivering the video.
