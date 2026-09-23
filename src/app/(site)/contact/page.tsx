import type { Metadata } from "next";
import { LeadForm } from "@/components/forms/LeadForm";

export const metadata: Metadata = { title: "Book a demo" };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const preselect = typeof sp.package === "string" ? [sp.package] : [];
  const type = typeof sp.type === "string" ? sp.type : undefined;
  return (
    <section className="container-x grid gap-12 pt-32 pb-24 lg:grid-cols-2">
      <div>
        <span className="eyebrow">Book a demo</span>
        <h1 className="h-display mt-5 text-4xl sm:text-5xl">See AIbooking answer calls for your own clinic</h1>
        <p className="mt-4 text-lg text-ink-300">In 20 minutes we show you how the AI receptionist answers your phone and your website, books into your calendar and handles rebookings and cancellations – with your treatments, prices and team.</p>
        <ul className="mt-8 space-y-3 text-ink-300">
          <li>✓ We set up an AI agent with your price list before the meeting</li>
          <li>✓ You get your own demo phone number to call</li>
          <li>✓ We show the integration with your current booking or journal system</li>
          <li>✓ No commitment – cancel anytime</li>
        </ul>
      </div>
      <LeadForm preselect={preselect} type={type} />
    </section>
  );
}
