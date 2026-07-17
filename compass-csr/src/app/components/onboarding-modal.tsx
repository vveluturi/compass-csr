import { useState } from "react";
import { useNavigate } from "react-router";
import { Compass as CompassIcon, ClipboardList, Mail, FileBarChart } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useAuth } from "../context/auth-context";
import { notifySettingsUpdated } from "../lib/settings";

// ─── Onboarding state (compass_onboarding_v1) ──────────────────────────────────

interface OnboardingState {
  completed: boolean;
  completedAt: string | null;
  isInvitedMember: boolean;
}

const ONBOARDING_KEY = "compass_onboarding_v1";

function loadOnboardingState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingState) : null;
  } catch {
    return null;
  }
}

function saveOnboardingState(state: OnboardingState) {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  } catch {
    // fail silently
  }
}

// ─── Company industry/size (reads/writes into compass_settings_v1, without
// touching the notifications/account slices Settings.tsx owns) ────────────────

const SETTINGS_KEY = "compass_settings_v1";

function loadCompanyIndustrySize(): { industry: string; companySize: string } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      industry: parsed?.company?.industry ?? "",
      companySize: parsed?.company?.companySize ?? "",
    };
  } catch {
    return { industry: "", companySize: "" };
  }
}

function saveCompanyIndustrySize(fields: { industry: string; companySize: string }) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = { ...parsed, company: { ...(parsed.company ?? {}), ...fields } };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // fail silently
  }
  notifySettingsUpdated();
}

// ─── Same options as the New Program intake form (step 1) ─────────────────────

const INDUSTRIES = [
  "Technology", "Retail", "Financial Services", "Healthcare",
  "Manufacturing", "Professional Services", "Food & Beverage", "Education", "Other",
];

const COMPANY_SIZES = [
  { label: "1–50", value: "1-50" },
  { label: "51–200", value: "51-200" },
  { label: "201–1,000", value: "201-1000" },
  { label: "1,001–5,000", value: "1001-5000" },
  { label: "5,000+", value: "5000+" },
];

function firstNameFrom(fullName: string | undefined, email: string | undefined): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "there";
}

// ─── Small building blocks ──────────────────────────────────────────────────

function RadioPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-foreground border-border hover:border-primary/50 hover:bg-accent/30"
      }`}
    >
      {label}
    </button>
  );
}

function FeaturePill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3.5 py-2.5">
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <span className="text-sm text-foreground text-left">{text}</span>
    </div>
  );
}

function OrientationCard({
  icon: Icon,
  title,
  desc,
  onGoThere,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  onGoThere: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGoThere}
        className="text-xs font-medium text-primary hover:underline flex-shrink-0"
      >
        Go there →
      </button>
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function OnboardingModal({ isInvitedMember }: { isInvitedMember: boolean }) {
  const navigate = useNavigate();
  const { userProfile, user, company } = useAuth();

  const [open, setOpen] = useState(() => {
    const state = loadOnboardingState();
    return !state || !state.completed;
  });
  const [screen, setScreen] = useState(1);
  const [industry, setIndustry] = useState(() => loadCompanyIndustrySize().industry);
  const [companySize, setCompanySize] = useState(() => loadCompanyIndustrySize().companySize);

  if (!open) return null;

  const firstName = firstNameFrom(userProfile?.full_name, user?.email);
  const companyName = company?.name?.trim() || "your company";
  const totalScreens = isInvitedMember ? 2 : 3;

  function complete() {
    saveOnboardingState({ completed: true, completedAt: new Date().toISOString(), isInvitedMember });
    setOpen(false);
  }

  function handleCompanySetupContinue() {
    saveCompanyIndustrySize({ industry, companySize });
    setScreen(3);
  }

  function handleBuildProgram() {
    complete();
    navigate("/new-program");
  }

  function handleGoThere(to: string) {
    complete();
    navigate(to);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <CompassIcon className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Compass</span>
          </div>

          {isInvitedMember ? (
            screen === 1 ? (
              <div key="member-1" className="animate-in fade-in slide-in-from-right-4 duration-300 text-center space-y-5">
                <div className="text-5xl">👋</div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Welcome to {companyName}'s CSR workspace!
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You've been added as a team member. Here's what you can do:
                  </p>
                </div>
                <div className="space-y-2">
                  <FeaturePill emoji="📋" text="View and update your assigned tasks" />
                  <FeaturePill emoji="💬" text="Submit questions and feedback on programs" />
                  <FeaturePill emoji="📊" text="Track progress in the Impact Report" />
                </div>
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setScreen(2)}
                >
                  Take a look around →
                </Button>
              </div>
            ) : (
              <div key="member-2" className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
                <h2 className="text-xl font-semibold text-foreground text-center">
                  Here's where to find everything
                </h2>
                <div className="space-y-2.5">
                  <OrientationCard
                    icon={ClipboardList}
                    title="My Tasks"
                    desc="See all tasks assigned to you across every program"
                    onGoThere={() => handleGoThere("/my-tasks")}
                  />
                  <OrientationCard
                    icon={Mail}
                    title="Team Inbox"
                    desc="Ask questions and share feedback with your Admin"
                    onGoThere={() => handleGoThere("/team-inbox")}
                  />
                  <OrientationCard
                    icon={FileBarChart}
                    title="Impact Report"
                    desc="See how your company's CSR programs are performing"
                    onGoThere={() => handleGoThere("/impact-report")}
                  />
                </div>
                <Button
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={complete}
                >
                  Go to Dashboard →
                </Button>
              </div>
            )
          ) : screen === 1 ? (
            <div key="admin-1" className="animate-in fade-in slide-in-from-right-4 duration-300 text-center space-y-5">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome to Compass CSR, {firstName}!
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You're about to build a CSR program that actually fits your company. It only takes a few minutes to get started.
                </p>
              </div>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setScreen(2)}
              >
                Let's get started →
              </Button>
              <button
                type="button"
                onClick={complete}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
            </div>
          ) : screen === 2 ? (
            <div key="admin-2" className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Tell us a bit about {companyName}
                </h2>
                <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
              </div>

              <div className="space-y-1.5">
                <Label>Industry</Label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                  }}
                >
                  <option value="">Select an industry…</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Company size</Label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_SIZES.map((size) => (
                    <RadioPill
                      key={size.value}
                      label={size.label}
                      selected={companySize === size.value}
                      onClick={() => setCompanySize(size.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setScreen(1)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <Button
                  onClick={handleCompanySetupContinue}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Continue →
                </Button>
              </div>
            </div>
          ) : (
            <div key="admin-3" className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
              <h2 className="text-xl font-semibold text-foreground text-center">
                How would you like to start?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleBuildProgram}
                  className="text-left rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-5 space-y-2"
                >
                  <div className="text-3xl">🚀</div>
                  <p className="text-sm font-semibold text-foreground">Build my first CSR program</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Answer a few questions and our AI will generate a tailored program blueprint
                  </p>
                </button>
                <button
                  type="button"
                  onClick={complete}
                  className="text-left rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-5 space-y-2"
                >
                  <div className="text-3xl">👀</div>
                  <p className="text-sm font-semibold text-foreground">Explore the app first</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Take a look around and start a program when you're ready
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {Array.from({ length: totalScreens }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 === screen ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
