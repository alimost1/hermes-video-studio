"use client";
import { useState } from "react";
import type { Project } from "@/src/shared/schema";
import type { PropertyBoard } from "@/src/shared/property";

export function PropertyEditor({
  project,
  busy,
  save,
  render,
}: {
  project: Project & { property: PropertyBoard };
  busy: boolean;
  save: (board: PropertyBoard) => void;
  render: () => void;
}) {
  const [board, setBoard] = useState(project.property);
  const changed =
    board !== project.property &&
    JSON.stringify(board) !== JSON.stringify(project.property);
  const fields = {
    title: "Cover title",
    location: "Neighborhood",
    status: "Listing status",
    reference: "Reference",
    price: "Price with currency",
    priceLabel: "Price label",
    agency: "Agency",
    invite: "Viewing invitation",
    phone: "Phone",
    website: "Website",
  };
  const photoSelect = (
    label: string,
    photo: PropertyBoard["cover"],
    pick: (p: PropertyBoard["cover"]) => void,
  ) => (
    <label>
      {label}
      <select
        value={photo.imageIndex}
        onChange={(e) => pick({ ...photo, imageIndex: Number(e.target.value) })}
      >
        {project.source?.images.map((url, i) => (
          <option key={url} value={i}>
            {i + 1} ·{" "}
            {project.source?.imageLabels?.[i] ||
              new URL(url).pathname.split("/").pop()}
          </option>
        ))}
      </select>
    </label>
  );
  function editChapter(
    i: number,
    patch: Partial<PropertyBoard["chapters"][number]>,
  ) {
    setBoard({
      ...board,
      chapters: board.chapters.map((c, n) =>
        i === n ? { ...c, ...patch } : c,
      ),
    });
  }
  return (
    <div className="scene-editor">
      {project.propertyProof && (
        <a href={project.propertyProof} target="_blank" rel="noreferrer">
          <img
            src={project.propertyProof}
            alt="Open the full property tour proof sheet"
            style={{ width: "100%", display: "block" }}
          />
        </a>
      )}
      <details>
        <summary>Listing details</summary>
        <div className="scene-fields">
          {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
            <label key={key}>
              {fields[key]}
              <input
                value={board[key]}
                maxLength={key === "title" ? 80 : 90}
                onChange={(e) => setBoard({ ...board, [key]: e.target.value })}
              />
            </label>
          ))}
          {photoSelect("Cover photo", board.cover, (cover) =>
            setBoard({ ...board, cover }),
          )}
          {photoSelect("Closing photo", board.close ?? board.cover, (close) =>
            setBoard({ ...board, close }),
          )}
          {[0, 1].map((i) => (
            <label key={i}>
              Cover fact {i + 1} (value and label)
              {([0, 1] as const).map((col) => (
                <input
                  key={col}
                  aria-label={col ? "Fact label" : "Fact value"}
                  placeholder={col ? "Label" : "Value"}
                  value={board.facts[i]?.[col] ?? ""}
                  maxLength={col ? 50 : 40}
                  onChange={(e) => {
                    const facts: PropertyBoard["facts"] = [
                      [...(board.facts[0] ?? ["", ""])],
                      [...(board.facts[1] ?? ["", ""])],
                    ];
                    facts[i][col] = e.target.value;
                    setBoard({ ...board, facts });
                  }}
                />
              ))}
            </label>
          ))}
        </div>
      </details>
      {board.chapters.map((c, i) => (
        <details key={i}>
          <summary>{c.name || "Room"}</summary>
          <div className="scene-fields">
            <label>
              Room name
              <input
                value={c.name}
                maxLength={40}
                onChange={(e) => editChapter(i, { name: e.target.value })}
              />
            </label>
            {photoSelect("Upper photo", c.upper, (upper) =>
              editChapter(i, { upper }),
            )}
            <label>
              Upper caption
              <input
                value={c.upperCaption}
                maxLength={90}
                onChange={(e) =>
                  editChapter(i, { upperCaption: e.target.value })
                }
              />
            </label>
            {photoSelect("Lower photo", c.lower, (lower) =>
              editChapter(i, { lower }),
            )}
            <label>
              Lower caption
              <input
                value={c.lowerCaption}
                maxLength={90}
                onChange={(e) =>
                  editChapter(i, { lowerCaption: e.target.value })
                }
              />
            </label>
          </div>
        </details>
      ))}
      <div className="button-row">
        <button
          className="secondary"
          disabled={busy || !changed}
          onClick={() =>
            save({ ...board, facts: board.facts.filter((f) => f[0].trim()) })
          }
        >
          Save and update proof
        </button>
        <button className="primary" disabled={busy || changed} onClick={render}>
          Render property reel
        </button>
      </div>
    </div>
  );
}
