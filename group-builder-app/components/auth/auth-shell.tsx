import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  Building2,
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

type AuthVariant = "login" | "register" | "join";

type AuthShellProps = {
  variant: AuthVariant;
  children: ReactNode;
};

const pageCopy: Record<AuthVariant, {
  badge: string;
  title: string;
  description: string;
  illustration: "dashboard" | "organization" | "join";
  benefits: Array<{ icon: ReactNode; title: string; text: string }>;
}> = {
  login: {
    badge: "Trusted by ministries and organizations",
    title: "Smart Grouping. Stronger Connections.",
    description:
      "Automate candidate organization, form balanced groups, assign rooms, and stay conflict-free in one system.",
    illustration: "dashboard",
    benefits: [
      { icon: <Lock size={18} />, title: "Secure Access", text: "Your data is protected with enterprise-grade security." },
      { icon: <ArrowRightLeft size={18} />, title: "Real-time Sync", text: "Stay up to date across devices and team members." },
      { icon: <UsersRound size={18} />, title: "Built for Ministry", text: "Designed to help your team serve and organize with excellence." },
    ],
  },
  register: {
    badge: "New organization setup",
    title: "Create your organization",
    description: "Set up your organization and start building better groups.",
    illustration: "organization",
    benefits: [
      { icon: <ShieldCheck size={18} />, title: "Secure & Private", text: "Your data is protected with enterprise-grade security." },
      { icon: <ArrowRightLeft size={18} />, title: "Real-time Sync", text: "Stay up-to-date across devices and team members." },
      { icon: <UsersRound size={18} />, title: "Built for Ministry", text: "Designed to help you serve and organize with excellence." },
    ],
  },
  join: {
    badge: "Request access",
    title: "Join an organization",
    description: "Enter your organization's slug to request access and start collaborating with your team.",
    illustration: "join",
    benefits: [
      { icon: <Lock size={18} />, title: "Request Access", text: "Ask your organization admin for the slug to get started." },
      { icon: <UsersRound size={18} />, title: "Quick & Easy", text: "Fill in your details and we'll handle the rest." },
      { icon: <ShieldCheck size={18} />, title: "Be Part of the Team", text: "Collaborate and help make group building more effective." },
    ],
  },
};

export function AuthShell({ variant, children }: AuthShellProps) {
  const copy = pageCopy[variant];

  return (
    <main className={`auth-page auth-page-${variant}`}>
      <div className="auth-frame">
        <section className="auth-brand-panel" aria-label="Group Builder">
          <BrandLockup />

          <div className="auth-hero">
            <div className="auth-trust-pill">
              <Sparkles size={14} />
              <span>{copy.badge}</span>
            </div>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>

          <AuthIllustration type={copy.illustration} />

          <div className="auth-benefits" aria-label="Platform benefits">
            {copy.benefits.map((benefit) => (
              <div className="auth-benefit" key={benefit.title}>
                <span className="auth-benefit-icon">{benefit.icon}</span>
                <span>
                  <strong>{benefit.title}</strong>
                  <small>{benefit.text}</small>
                </span>
              </div>
            ))}
          </div>

          <footer className="auth-footer">
            <span>(c) 2025 Group Builder. All rights reserved.</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </footer>
        </section>

        <section className="auth-form-panel">
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthLogo() {
  return (
    <span className="auth-logo" aria-hidden="true">
      <UsersRound size={30} strokeWidth={2.2} />
    </span>
  );
}

function BrandLockup() {
  return (
    <div className="auth-brand-lockup">
      <AuthLogo />
      <span>
        <strong>Group Builder</strong>
        <small>Shepherd&apos;s Grouping System</small>
      </span>
    </div>
  );
}

function AuthIllustration({ type }: { type: "dashboard" | "organization" | "join" }) {
  if (type === "organization") {
    return (
      <div className="auth-illustration auth-illustration-org" aria-hidden="true">
        <span className="auth-orbit auth-orbit-lg" />
        <span className="auth-dot-grid" />
        <div className="auth-building">
          <Building2 size={108} />
        </div>
        <span className="auth-person auth-person-left" />
        <span className="auth-person auth-person-right" />
      </div>
    );
  }

  if (type === "join") {
    return (
      <div className="auth-illustration auth-illustration-join" aria-hidden="true">
        <span className="auth-orbit auth-orbit-lg" />
        <span className="auth-dot-grid" />
        <div className="auth-people-glow">
          <UsersRound size={118} />
          <span className="auth-plus">+</span>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-illustration auth-illustration-dashboard" aria-hidden="true">
      <span className="auth-orbit auth-orbit-sm" />
      <span className="auth-dot-grid" />
      <div className="auth-window">
        <div className="auth-window-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-window-body">
          <div className="auth-window-nav">
            <UsersRound size={18} />
            <i />
            <i />
            <i />
          </div>
          <div className="auth-window-chart">
            <b />
            <b />
            <b />
            <b />
          </div>
          <div className="auth-window-card" />
          <div className="auth-shield">
            <Check size={40} />
          </div>
        </div>
      </div>
    </div>
  );
}
