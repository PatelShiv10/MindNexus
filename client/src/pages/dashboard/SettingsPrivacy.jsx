import { Shield } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const sections = [
  {
    title: '1. Data Collection',
    content: `We collect only what's necessary to run your account: your name, email address, and the documents you choose to upload. We do not run background trackers or monitor your behavior outside of the MindNexus dashboard.`,
  },
  {
    title: '2. How Your Data Is Used',
    content: `Your uploaded documents are processed to build your personal knowledge graph and power the AI Tutor. This processing happens solely on your behalf — your data is never used to train shared models, shown to other users, or sold to third parties.`,
  },
  {
    title: '3. AI Processing',
    content: `Document content is transmitted to third-party AI APIs (such as Google Gemini) strictly to generate embeddings and analyze entities. We do not run local LLMs; we rely on these external APIs to process your data during active sessions.`,
  },
  {
    title: '4. Data Security',
    content: `We secure your account using industry standards. Passwords are cryptographically hashed using bcrypt and are never stored in plain text. User sessions are stateless and secured using JSON Web Tokens (JWT).`,
  },
  {
    title: '5. Cookies & Local Storage',
    content: `We use cookies and your browser's local storage strictly for essential app functionality, such as keeping you logged in and remembering your UI theme preferences. We do not use third-party advertising or analytics cookies.`,
  },
  {
    title: '6. AI Tutor Conversations',
    content: `Chat sessions with the AI Tutor are stored in your account to maintain context history. They remain private to your user profile and are not reviewed by MindNexus staff.`,
  },
  {
    title: '7. Data Deletion',
    content: `You have full control over your archives. Deleting a document from your Nexus permanently removes it from our storage and deletes its associated vector embeddings from the database.`,
  },
  {
    title: '8. Account Removal',
    content: `You can request full deletion of your account at any time. This action is irreversible and purges all your associated documents, AI conversations, and profile details from our active databases.`,
  },
  {
    title: '9. Contact Us',
    content: `For privacy questions, data access requests, or to initiate a full account deletion, contact us at privacy@appiflyinfotech.com. We aim to respond within 5 business days.`,
  },
];

export default function SettingsPrivacy() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-neon-blue shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Privacy Policy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Effective March 2026 · Appifly Infotech</p>
        </div>
      </div>

      {/* Intro */}
      <GlassCard className="p-5">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          MindNexus is built on the principle that your data belongs to you. This policy reflects exactly how our current system handles your information. There are no hidden trackers, no data brokers, and no marketing algorithms.
        </p>
      </GlassCard>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ title, content }) => (
          <GlassCard key={title} className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{content}</p>
          </GlassCard>
        ))}
      </div>

      <p className="text-xs text-center text-slate-400 dark:text-slate-500">
        This policy will be updated as we add new features to the platform.
      </p>
    </div>
  );
}
