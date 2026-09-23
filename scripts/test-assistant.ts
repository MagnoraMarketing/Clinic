// Smoke test of the demo receptionist against the real booking services
// (in-memory store): npm run test:assistant
import { DEMO_CLINICS } from "../src/lib/demo/clinics";
import { initialState, respond, type AssistantContext, type AssistantState } from "../src/lib/assistant/engine";
import { createAppointment, getAvailability, lookupAppointments, updateAppointment } from "../src/lib/server/services";
import { repo } from "../src/lib/server/repository";

let failures = 0;

async function ctxFor(slug: string): Promise<AssistantContext> {
  const clinic = DEMO_CLINICS.find((c) => c.slug === slug)!;
  const catalog = await repo().getCatalog(clinic.id);
  return {
    clinic,
    catalog,
    source: "chat",
    api: {
      availability: (q) => getAvailability(q),
      createAppointment: (b) => createAppointment(b as never),
      lookup: (reference, phone) => lookupAppointments({ clinicId: clinic.id, reference, phone }),
      updateAppointment: (id, b) => {
        const { phone: _p, source, ...patch } = b as Record<string, unknown>;
        return updateAppointment(id, patch, { by: (source as "chat") ?? "chat" });
      },
    },
  };
}

async function run(title: string, slug: string, lines: string[], expect?: RegExp) {
  console.log(`\n=== ${title} (${slug})`);
  const ctx = await ctxFor(slug);
  let s: AssistantState = initialState();
  let last = "";
  for (const l of lines) {
    const res = await respond(ctx, s, l);
    s = res.state;
    console.log(`> ${l}`);
    for (const m of res.replies) {
      last = m.text;
      const card = m.card?.type === "summary" ? ` [${m.card.lines.map((x) => `${x.label}: ${x.value}`).join(" | ")}]` : m.card?.type === "appointment" ? ` [${m.card.appointment.reference} ${m.card.appointment.status} ${m.card.appointment.date} ${m.card.appointment.time}]` : m.card ? ` [${m.card.type}]` : "";
      const q = m.quickReplies?.length ? `  {${m.quickReplies.map((x) => x.label).join(" / ")}}` : "";
      console.log(`  AI: ${m.text}${card}${q}`);
    }
  }
  if (expect && !expect.test(last)) {
    failures++;
    console.log(`  ✗ expected last reply to match ${expect}`);
  }
  return s;
}

(async () => {
  await run("Book one-shot", "calm-hands", ["Do you have time for a deep tissue massage tomorrow afternoon?", "the first one", "Anna Jensen", "22 33 44 55", "yes"], /booked ✓/);
  await run("Book step by step", "studio-nord", ["Hi", "I'd like to book an appointment", "men's cut", "with Malik", "friday", "at 11", "John Smith", "+44 7700 900123", "yes"], /booked ✓|taken|free times/);
  await run("Prices & questions", "calm-hands", ["How much is a 60 minute massage?", "What are your prices?", "Does my insurance cover massage?", "When are you open?", "Where can I park?", "What's your cancellation policy?"]);
  await run("Dental – new patient pending", "smile-dental", ["I'd like to register as a new patient", "no preference", "tomorrow", "the first one", "Lisa Berg", "11223344", "yes"], /request is registered|booked ✓/);
  await run("Dental – toothache", "smile-dental", ["I have a toothache, can I come today?"]);

  // Rebook + cancel an appointment made above
  const clinic = DEMO_CLINICS.find((c) => c.slug === "calm-hands")!;
  const booked = (await repo().listAppointments(clinic.id)).find((a) => a.customer.name === "Anna Jensen");
  if (!booked) {
    failures++;
    console.log("✗ Anna's booking not found");
  } else {
    await run("Rebook", "calm-hands", [`I need to move my appointment ${booked.reference}`, "22334455", "next friday morning", "the first one"], /moved to/);
    await run("Cancel", "calm-hands", ["I have to cancel my appointment", booked.reference, "22334455", "yes cancel it"], /cancelled/);
  }
  console.log(failures ? `\n✗ ${failures} failure(s)` : "\n✓ all flows passed");
  process.exit(failures ? 1 : 0);
})();
