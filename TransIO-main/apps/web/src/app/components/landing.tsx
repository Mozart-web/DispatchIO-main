import React from "react";
import { Link, Navigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Filter,
  History,
  Instagram,
  LockKeyhole,
  Music2,
  Radio,
  Send,
  Users,
} from "lucide-react";
import { useAppState } from "../context/app-state";

const heroContainer = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.18,
      staggerChildren: 0.12,
    },
  },
};

const heroReveal = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const features = [
  {
    title: "Real-time load monitoring",
    description:
      "Track freight opportunities as they arrive and keep active lanes visible for dispatch decisions.",
    icon: Radio,
  },
  {
    title: "Dispatcher-first dashboard",
    description:
      "Use a clean truck dispatch dashboard built around scanning, saving, and acting on carrier loads.",
    icon: ClipboardList,
  },
  {
    title: "Broker and contact organization",
    description:
      "Organize broker details, load references, contact signals, and dispatch notes in one workflow.",
    icon: Users,
  },
  {
    title: "Load history and filtering",
    description:
      "Filter freight load board data by lane, rate, pickup window, equipment, broker, and tags.",
    icon: Filter,
  },
  {
    title: "Secure user authentication",
    description:
      "Protect dispatcher and carrier workflows with Supabase authentication and role-aware access.",
    icon: LockKeyhole,
  },
  {
    title: "Production-ready workflow",
    description:
      "Move from load intelligence to saved opportunities and booked freight with a practical SaaS flow.",
    icon: History,
  },
];

const faqs = [
  {
    question: "What is TransIO?",
    answer:
      "TransIO is a premium freight logistics platform that helps dispatchers and carriers monitor load data, organize opportunities, and manage freight workflows from a focused dashboard.",
  },
  {
    question: "Who is TransIO for?",
    answer:
      "TransIO is built for dispatch teams, owner-operators, carriers, and logistics operators who need a fast way to review freight opportunities and keep load management software organized.",
  },
  {
    question: "Does TransIO replace a load board?",
    answer:
      "TransIO is designed for teams that want cleaner load intelligence, filtering, saved loads, and operational visibility.",
  },
  {
    question: "Can dispatchers manage freight opportunities?",
    answer:
      "Yes. Dispatchers can monitor carrier loads, save promising lanes, book opportunities, and review historical freight activity from a single dispatch software workspace.",
  },
  {
    question: "Is TransIO built for teams?",
    answer:
      "Yes. TransIO supports secure user authentication, admin visibility, and role-aware workflows for modern dispatch teams.",
  },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/transio.loadboard?igsh=YjJhdXdha2VvNTUw",
    icon: Instagram,
  },
  {
    label: "Telegram",
    href: "https://t.me/trans_IO",
    icon: Send,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@trans.io?_r=1&_t=ZS-96dVlPdqwY0",
    icon: Music2,
  },
];

export function Landing() {
  const { authReady, isAuthenticated } = useAppState();
  const reduceMotion = useReducedMotion();

  if (authReady && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section
        className="relative min-h-[92vh] overflow-hidden border-b border-border bg-background"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_25%,rgba(255,255,255,0.10),transparent_31%),radial-gradient(circle_at_18%_84%,rgba(255,255,255,0.045),transparent_28%)]" />
          <div className="absolute inset-x-[9%] top-24 bottom-14 rounded-2xl border border-white/[0.045]" />
          <motion.div
            className="absolute -right-36 top-20 h-80 w-80 rounded-full bg-white/[0.07] blur-3xl"
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -64, 18, 0],
                    y: [0, 46, -10, 0],
                    scale: [1, 1.15, 0.96, 1],
                  }
            }
            transition={{
              duration: 18,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
          <motion.div
            className="absolute bottom-28 left-[36%] h-px w-[34rem] bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0.1, 0.62, 0.1],
                    x: [-42, 48, -42],
                  }
            }
            transition={{
              duration: 5.8,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </div>

        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"
        >
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="TransIO"
              loading="eager"
              decoding="async"
              className="h-10 w-10 rounded-lg border border-white/15 bg-white object-contain"
            />
            <span className="text-lg font-semibold text-white">TransIO</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/76 transition hover:bg-white/10 hover:text-white"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Get started
            </Link>
          </nav>
        </motion.header>

        <div className="relative z-10 mx-auto flex min-h-[calc(92vh-82px)] max-w-7xl items-center px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-3xl"
            variants={heroContainer}
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
          >
            <motion.p
              variants={heroReveal}
              className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62"
            >
              Freight load board intelligence
            </motion.p>
            <motion.h1
              variants={heroReveal}
              className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
            >
              Premium Freight Load Intelligence for Modern Dispatch Teams
            </motion.h1>
            <motion.p
              variants={heroReveal}
              className="mt-6 max-w-2xl text-base leading-8 text-white/76 sm:text-lg"
            >
              TransIO helps dispatchers and carriers monitor freight
              opportunities, organize load data, and make faster decisions from
              a clean logistics dashboard.
            </motion.p>
            <motion.div
              variants={heroReveal}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 330, damping: 23 }}
              >
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Start with TransIO
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 330, damping: 23 }}
              >
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign in
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border bg-card px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            "freight load board",
            "dispatch software",
            "real-time load tracking",
          ].map((keyword) => (
            <div
              key={keyword}
              className="rounded-lg border border-border bg-background p-5"
            >
              <CheckCircle2 className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm font-semibold capitalize text-foreground">
                {keyword}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Built for practical freight logistics platform workflows and
                daily carrier load decisions.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Platform features
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
              Load management software for focused dispatch operations
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              TransIO keeps load board monitoring, truck dispatch dashboard
              activity, saved opportunities, and freight logistics decisions in
              one premium workspace.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">
            Freight dispatch questions
          </h2>
          <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-background">
            {faqs.map((faq) => (
              <article key={faq.question} className="p-5">
                <h3 className="text-base font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-y border-border py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Run dispatch operations from a cleaner load workspace.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Monitor carrier loads, organize freight opportunities, and keep
              teams moving with TransIO.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-9 w-9 rounded-md border border-border bg-white object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">TransIO</p>
              <p className="text-xs text-muted-foreground">
                Freight intelligence for dispatch teams.
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap gap-2" aria-label="TransIO social links">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow TransIO on ${label}`}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 330, damping: 23 }}
                className="group inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
                <ExternalLink
                  className="h-3.5 w-3.5 opacity-45 transition group-hover:opacity-100"
                  aria-hidden="true"
                />
              </motion.a>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
