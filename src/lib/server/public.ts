import type { Clinic } from "@/lib/types";

/** The one place that controls what may be exposed publicly about a clinic. */
export function toPublicClinic(c: Clinic) {
  const { widget, ...rest } = c;
  return {
    ...rest,
    widget: {
      clinicId: widget.clinicId,
      agentId: widget.agentId,
      voiceAgentId: widget.voiceAgentId,
      chatAgentId: widget.chatAgentId,
      theme: widget.theme,
      accentColor: widget.accentColor,
      welcomeMessage: widget.welcomeMessage,
      position: widget.position,
      enabled: widget.enabled,
    },
  };
}
