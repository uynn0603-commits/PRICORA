// Invitation designs. Separate from the album gallery catalog so a new thiệp
// never changes how photo albums render. Add a template by listing it here and
// registering its component in components/invitations/InvitationView.tsx.

export const DEFAULT_INVITATION_TEMPLATE_ID = "classic";

export interface InvitationTemplateMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  swatch: { bg: string; ink: string; accent: string };
}

export const INVITATION_TEMPLATES: InvitationTemplateMeta[] = [
  {
    id: "classic",
    name: "Classic Ivory",
    tagline: "Thiệp ngà cổ điển",
    description: "Ảnh lớn, cánh hoa rơi và lịch ngày cưới.",
    swatch: { bg: "#FBF7F2", ink: "#2C241C", accent: "#9A7B4F" },
  },
  {
    id: "golden-letter",
    name: "Golden Letter",
    tagline: "A Love Letter From Two Hearts",
    description: "Mở phong bì vàng, rồi đọc thiệp như một bức thư tình tối giản.",
    swatch: { bg: "#F7F1E7", ink: "#49382D", accent: "#B99A62" },
  },
  {
    id: "traditional-wedding",
    name: "Traditional Wedding",
    tagline: "Thiệp truyền thống",
    description: "Nền kem, đỏ đô, lịch ngày cưới, hai gia đình và chỉ đường.",
    swatch: { bg: "#F7F1E8", ink: "#3A241C", accent: "#8C1D2C" },
  },
];

export function isInvitationTemplateId(id?: string): boolean {
  return INVITATION_TEMPLATES.some((item) => item.id === id);
}

export function invitationTemplateId(id?: string): string {
  return isInvitationTemplateId(id) ? id! : DEFAULT_INVITATION_TEMPLATE_ID;
}

export function getInvitationTemplate(id?: string): InvitationTemplateMeta {
  const resolved = invitationTemplateId(id);
  return INVITATION_TEMPLATES.find((item) => item.id === resolved) || INVITATION_TEMPLATES[0];
}
