"use client";

import { listTemplates } from "../templates";
import { TemplateCard } from "./TemplateCard";

export function TemplateSelector({
  selected,
  suggested,
  current,
  selectLabel,
  onSelect,
  onPreview,
}: {
  selected: string;
  suggested?: string;
  current?: string;
  selectLabel?: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {listTemplates().map((meta) => (
        <TemplateCard
          key={meta.id}
          meta={meta}
          selected={meta.id === selected}
          suggested={meta.id === suggested}
          current={meta.id === current}
          selectLabel={selectLabel}
          onSelect={onSelect}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
