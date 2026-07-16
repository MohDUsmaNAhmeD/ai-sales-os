"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkedInIcon, FacebookIcon, TwitterIcon, ThreadsIcon, PeoplePerHourIcon, getPlatformColor } from "@/components/PlatformIcons";

const steps = [
  { id: 1, title: "Welcome", subtitle: "Let's get your AI Sales OS set up" },
  { id: 2, title: "Connect Platforms", subtitle: "Add your first social platform" },
  { id: 3, title: "AI Setup", subtitle: "Configure your Mistral AI key" },
  { id: 4, title: "Ready", subtitle: "Start discovering leads" },
];

const platforms = [
  { id: "LINKEDIN", name: "LinkedIn", icon: LinkedInIcon, color: "#0a66c2", description: "B2B leads, professional networking" },
  { id: "FACEBOOK", name: "Facebook", icon: FacebookIcon, color: "#1877f2", description: "Groups, pages, marketplace" },
  { id: "TWITTER", name: "Twitter / X", icon: TwitterIcon, color: "#000", description: "Public conversations, trends" },
  { id: "THREADS", name: "Threads", icon: ThreadsIcon, color: "#000", description: "Meta's text-based platform" },
  { id: "PEOPLEPERHOUR", name: "PeoplePerHour", icon: PeoplePerHourIcon, color: "#29ABE2", description: "Freelancers, service providers" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [cookies, setCookies] = useState("");
  const [mistralKey, setMistralKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save Mistral key
      if (mistralKey) {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mistralKey }),
        });
      }

      // Save platform connection
      if (selectedPlatform && cookies) {
        await fetch("/api/connectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: selectedPlatform,
            accessToken: cookies,
          }),
        });
      }

      // Mark onboarding complete
      localStorage.setItem("onboarding_complete", "true");
      router.push("/");
    } catch (error) {
      console.error("Setup failed:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`h-2 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? "bg-blue-500" : "bg-gray-700"
              }`} />
            </div>
          ))}
        </div>

        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">AI</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to AI Sales OS</h1>
              <p className="text-gray-400 mb-8">
                Your all-in-one platform for lead discovery, outreach, and CRM — powered by AI.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left mb-8">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-blue-400 font-semibold mb-1">Lead Discovery</div>
                  <div className="text-sm text-gray-400">Find prospects across 5 platforms</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-green-400 font-semibold mb-1">Unified Inbox</div>
                  <div className="text-sm text-gray-400">All conversations in one place</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold mb-1">AI Assistant</div>
                  <div className="text-sm text-gray-400">Auto-draft, score, and follow up</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-orange-400 font-semibold mb-1">CRM Pipeline</div>
                  <div className="text-sm text-gray-400">Track deals from start to close</div>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
                Get Started
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect a Platform</h2>
              <p className="text-gray-400 mb-6">Choose your first platform to start discovering leads.</p>

              <div className="space-y-3 mb-6">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedPlatform === p.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-600 hover:border-gray-500 bg-gray-700/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color }}>
                      <p.icon className="text-white" size={20} />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">{p.name}</div>
                      <div className="text-sm text-gray-400">{p.description}</div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedPlatform && (
                <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Browser Cookies (optional but recommended)
                  </label>
                  <textarea
                    value={cookies}
                    onChange={(e) => setCookies(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Paste your browser cookies here for better results. Log into the platform, copy cookies from DevTools → Application → Cookies."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Without cookies, you'll get public results only. With cookies, you get access to more data and messaging features.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">AI Configuration</h2>
              <p className="text-gray-400 mb-6">Add your Mistral AI API key to unlock AI features like lead scoring, message drafting, and conversation summaries.</p>

              <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Mistral AI API Key
                </label>
                <input
                  type="password"
                  value={mistralKey}
                  onChange={(e) => setMistralKey(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Get your key at <a href="https://console.mistral.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.mistral.ai</a>. Free tier available.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="text-blue-400 font-medium text-sm mb-1">What AI can do:</div>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Score and qualify leads automatically</li>
                  <li>• Draft personalized outreach messages</li>
                  <li>• Summarize conversation history</li>
                  <li>• Detect buying intent</li>
                  <li>• Suggest follow-up actions</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  {mistralKey ? "Save & Continue" : "Skip for now"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
              <p className="text-gray-400 mb-8">
                Start by searching for leads in the Discovery tab. Your AI Sales OS is ready.
              </p>

              <div className="flex gap-3 justify-center">
                <button onClick={handleComplete} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {saving ? "Setting up..." : "Go to Dashboard"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
