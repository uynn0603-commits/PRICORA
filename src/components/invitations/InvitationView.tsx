import { invitationTemplateId } from "@/lib/invitation-catalog";
import { TRADITIONAL_TEMPLATE_ID } from "@/lib/invitation-content";
import { GoldenLetter } from "./GoldenLetter";
import { InvitationCard } from "./InvitationCard";
import { TraditionalWedding } from "./TraditionalWedding";
import type { InvitationViewProps } from "./types";

export function InvitationView(props: InvitationViewProps) {
  const template = invitationTemplateId(props.invitation.templateId);
  if (template === TRADITIONAL_TEMPLATE_ID) return <TraditionalWedding {...props} />;
  if (template === "golden-letter") return <GoldenLetter {...props} />;
  return <InvitationCard {...props} />;
}
