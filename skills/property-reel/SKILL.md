---
name: property-reel
description: Create a reusable charcoal-and-gold real estate video tour from an agency listing or a set of property photos. Use for vertical listing reels, just-listed videos, villa or apartment walkthroughs made from stills, and adaptations of the Marrakech property reel.
---

# Property Reel

Turn a verified listing into a finished portrait video. Let the photographs carry the tour. Use a dark sliding panel, a fine brass edge and tall room names to link the shots.

## Build the edit

1. Collect the asking price and currency, property type, neighborhood, areas with their meanings, source photographs and an actual viewing contact. Check each detail against the listing. Drop disputed counts and uncertain claims. Use the language requested or the listing's language. Keep the listing agency's identity distinct from any creator credit.
2. Look at the actual gallery. Pair two photographs that explain each space. Place a visually distinctive, vertically croppable view above and a broad view or detail below. For a small photo set, use a distinct crop of the same photo if it still communicates something. Make chapter names short enough to recognize on a phone. Put multiple amenities in the same chapter only if each image has its own clear caption. Keep the most memorable feature for the last chapter.
3. Copy the structure in `references/listing.example.json` into the working project. Replace all sample strings and filenames. Each image is a local path relative to the manifest or an absolute path. Set `x` and `y` between 0 and 1 to position the crop within the surplus source area. Use a maximum of two short cover facts by default. Leave unknown optional fields empty. For a rental, label the price and rental period together. Use the supplied public phone, booking address, or site in the last card.
4. Render a proof sheet and inspect it at phone size. Check that architectural features, furniture and watermarks remain legible where present. Check the photo-label pairs, amounts, currency, and contact digits. Adjust focal points or use a better frame if a crop hides the subject.
5. Export portrait MP4. Check the opening, a moving wipe and the closing card in the encoded video. Confirm stream dimensions, duration and sound. Deliver the video and, when requested, the storyboard or alternate sizes.

## Motion and layout

| Beat | Duration | Treatment |
| --- | --- | --- |
| Cover | 3.4 s | Place an exterior or signature room above a graphite title field. Set the locality in a large editorial serif, with the neighborhood in italic and up to two verified facts below a hairline. |
| Room | 2.8 s each | Fill the upper two thirds with one photograph. Give about one fifth of that photograph to a translucent charcoal rail. Read the room name upward in thin, tracked capitals. Fill the lower third with a second wide photograph. |
| Change of room | First 0.48 s of each incoming shot | Reveal the next composition from right to left on a gold edge. Ease into the new position and drift gently into each photograph. |
| Closing card | 4.5 s | Show an exterior strip, agency identity, asking price if public, one viewing invitation and the actual contact. Keep the main details away from the bottom overlay area. |

Use graphite `#1C201E`, warm ivory `#FBF6EA`, and brass `#D8B984`. Keep photographic colors natural. Combine an editorial roman and italic for place, price and invitation with a light sans serif for room names. Design each card to read with the sound muted.

## Render

In Hermes Video Studio, select **Property Reel** and submit the listing URL through the dashboard, or send its URL and `"style": "property-reel"` to the projects API. Use the review option to check photos and listing details before rendering.

For an offline edit, run `npm ci` in the studio checkout. Install FFmpeg, Python 3, NumPy and SciPy; the project Docker image supplies them. Set `skill_dir` to the absolute path of `skills/property-reel`, then run from the directory containing the local listing and photos.

```sh
node "$skill_dir/scripts/render.cjs" listing.json proof.jpg
python3 "$skill_dir/scripts/score.py" score.wav --chapters 4
node "$skill_dir/scripts/render.cjs" listing.json tour.mp4 score.wav
```

Set the chapter count in the score command to the actual number of entries. The original plucked-string score uses Python, NumPy and SciPy. Substitute an authorized track or omit the last argument for a silent cut. The renderer sets the timeline to 3.4 + 2.8 times the chapter count + 4.5 seconds and exports 1080 × 1920 at 30 fps. When using another editor, reproduce the shot order, crop positions, rail motion and holds in the table.
