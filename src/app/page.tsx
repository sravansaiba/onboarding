"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Check, ChefHat, ChevronDown, ClipboardCheck, QrCode, Settings2, Star, Truck, X } from "lucide-react";
import { Header } from "@/src/layout/Header";
import { Footer } from "@/src/layout/Footer";
import { supabase } from "@/src/lib/supabase/client";

const PACKAGES = {
  "marinate-menu": {
    label: "Marinate Menu",
    services: ["dine_in", "takeaway"],
    summary: "A clean QR menu and takeaway-ready setup for restaurants that want to go digital fast.",
    points: ["Unlimited QR code menu", "Easy menu management", "Customer self-service menu"],
  },
  "marinate-dinein": {
    label: "Marinate Dine",
    services: ["dine_in", "takeaway"],
    summary: "Table operations, KOT flow, waiter workflow, and dine-in focused ordering.",
    points: ["Table management", "Kitchen order tickets", "Shared order access"],
  },
  marinate360: {
    label: "Marinate 360",
    services: ["dine_in", "delivery", "takeaway", "catering"],
    summary: "The complete operating package for dine-in, delivery, takeaway, and catering.",
    points: ["Delivery and takeaway management", "Reservations and catering", "Analytics and reports"],
  },
} as const;

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<keyof typeof PACKAGES>("marinate-menu");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      setIsLoggedIn(Boolean(data.session || parsedUser));
    }

    loadSession();
  }, []);

  const selected = useMemo(() => PACKAGES[selectedPackage], [selectedPackage]);

  function startRegistration() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setShowPackages(true);
  }

  function continueToOnboarding() {
    router.push(`/onboarding?services=${encodeURIComponent(selected.services.join(","))}&package=${encodeURIComponent(selectedPackage)}`);
  }

  return (
    <main className="min-h-screen bg-[#fff8f1] text-zinc-950">
      <Header />

      <section
        className="relative min-h-[86vh] overflow-hidden bg-cover bg-center px-4 pt-28"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(17, 17, 17, 0.68) 0%, rgba(17, 17, 17, 0.38) 42%, rgba(255, 248, 241, 0.12) 100%), url("/bg2.jpg")',
        }}
      >
        <div className="mx-auto flex min-h-[calc(86vh-7rem)] max-w-7xl flex-col items-center justify-center pb-20 pt-16 text-center">
          <div className="max-w-4xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Restaurant onboarding</p>
            <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Grow your food business with <span className="text-orange-300">marinate360</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
              Start your restaurant with QR ordering, POS-ready workflows, table service, takeaway, delivery, and insights built for modern hospitality.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={startRegistration}
                className="rounded-md bg-orange-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600"
              >
                Register your restaurant
              </button>
            </div>
          </div>
        </div>
      </section>


      <section className="bg-white px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">About Marinate</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A restaurant operating layer for menus, orders, and daily service.</h2>
            <p className="mt-5 leading-8 text-zinc-600">
              Marinate360 brings digital menus, QR ordering, POS-friendly order flow, table operations, takeaway, delivery, kitchen display, and analytics into one modern restaurant platform.
            </p>
            <p className="mt-4 leading-8 text-zinc-600">
              Whether you are launching a new outlet or upgrading daily operations, the product is built to reduce manual work, improve guest experience, and give your team clearer control across every order channel.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature icon={<QrCode />} title="Digital menu and QR" body="Create a cleaner customer ordering entry point without depending on printed menus." />
            <Feature icon={<ChefHat />} title="Kitchen display system" body="Keep kitchen tickets organized with real-time order flow and preparation visibility." />
            <Feature icon={<Truck />} title="Takeaway and delivery" body="Manage pickup and delivery orders with clearer status updates for staff and customers." />
            <Feature icon={<Settings2 />} title="Restaurant control center" body="Manage menu, orders, service modes, tables, and business insights from one connected workspace." />
          </div>
        </div>
      </section>

      <section className="border-y border-orange-100 bg-[#fff8f1] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Why restaurants use it</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to run your restaurant with confidence.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Reason icon={<ClipboardCheck />} title="Faster daily operations" body="Orders, tables, kitchen tickets, and service requests stay organized so teams spend less time switching tools." />
            <Reason icon={<BarChart3 />} title="Smarter decisions" body="Track sales trends, peak hours, menu performance, and operational signals as your restaurant grows." />
            <Reason icon={<Settings2 />} title="Flexible for every format" body="Use the platform for dine-in, QR menu, takeaway, delivery, reservations, catering, and multi-channel service." />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">Client stories</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Built with real restaurant workflows in mind.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Testimonial name="Dasara Indian Kitchen" role="Cloud kitchen operator" quote="Marinate360 gives our team a cleaner way to handle menu updates, customer orders, and day-to-day order visibility." />
            <Testimonial name="Flash Back Arabian Mandi" role="Dine-in restaurant" quote="The dine-in tools make table service easier to manage, especially when the kitchen and floor staff need to stay aligned." />
            <Testimonial name="Mithai Shop" role="Quick-service brand" quote="QR ordering gives customers a faster way to browse, order, and move ahead without waiting for a printed menu." />
          </div>
        </div>
      </section>

      <section className="border-t border-orange-100 bg-[#fff8f1] px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl bg-zinc-950 p-6 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-300">FAQ</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
            <p className="mt-4 leading-7 text-white/70">
              Clear answers for restaurants exploring QR ordering, POS workflows, and Marinate360 plans.
            </p>
            <button onClick={startRegistration} className="mt-6 rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">
              Register your restaurant
            </button>
          </div>
          <div className="space-y-4">
            <FAQ question="What can I run with Marinate360?" answer="You can manage QR code menus, table ordering, kitchen tickets, takeaway, delivery, reservations, customer service requests, and business insights based on the plan you choose." />
            <FAQ question="Which plan should I choose?" answer="Marinate Menu is ideal for QR menu setup, Marinate Dine is built for dine-in automation, and Marinate 360 is for restaurants that need the complete operating suite." />
            <FAQ question="Do I need a technical team to get started?" answer="No. The setup flow is built for restaurant teams. You provide your business details and preferred plan, and the product setup can be configured for your restaurant." />
            <FAQ question="Can I upgrade later?" answer="Yes. Restaurants can start with a focused plan and move to a broader plan when they need dine-in automation, delivery, reservations, analytics, or more advanced operations." />
            <FAQ question="Does it work for dine-in, takeaway, and delivery?" answer="Yes. Marinate360 is designed for multiple restaurant formats, including dine-in restaurants, quick-service outlets, cloud kitchens, takeaway counters, and delivery operations." />
          </div>
        </div>
      </section>

      {showPackages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-orange-100 p-5">
              <div>
                <h2 className="text-2xl font-semibold">Select package</h2>
                <p className="text-sm text-zinc-500">Choose the plan that matches your restaurant operations.</p>
              </div>
              <button onClick={() => setShowPackages(false)} className="rounded-md p-2 hover:bg-zinc-100" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {Object.entries(PACKAGES).map(([id, pkg]) => {
                const active = selectedPackage === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedPackage(id as keyof typeof PACKAGES)}
                    className={`rounded-lg border p-4 text-left ${active ? "border-orange-500 bg-orange-50" : "border-zinc-200 hover:bg-zinc-50"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{pkg.label}</h3>
                      {active && <Check size={18} className="text-orange-600" />}
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                      {pkg.points.map((point) => (
                        <li key={point} className="flex gap-2">
                          <Check size={16} className="mt-0.5 text-orange-600" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 border-t border-orange-100 bg-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600">Selected: {selected.label}</p>
              <button onClick={continueToOnboarding} className="rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600">
                Continue to registration
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-orange-600">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}

function Reason({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-lg border border-orange-100 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-100 text-orange-600">{icon}</div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}

function Testimonial({ name, role, quote }: { name: string; role: string; quote: string }) {
  return (
    <article className="rounded-lg border border-orange-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-1 text-orange-500">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} size={16} fill="currentColor" />
        ))}
      </div>
      <p className="leading-7 text-zinc-700">&ldquo;{quote}&rdquo;</p>
      <div className="mt-5 border-t border-orange-100 pt-4">
        <h3 className="font-semibold">{name}</h3>
        <p className="mt-1 text-sm text-zinc-500">{role}</p>
      </div>
    </article>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold sm:text-lg">
        {question}
        <ChevronDown size={20} className="shrink-0 text-zinc-400 transition group-open:rotate-180" />
      </summary>
      <p className="mt-4 leading-7 text-zinc-600">{answer}</p>
    </details>
  );
}
