import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { 
  ArrowRight, 
  Brain, 
  ShieldCheck, 
  Users, 
  FileTerminal, 
  Github, 
  FileText, 
  Search, 
  Loader2,
  X,
  Menu,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// --- [1] MOCK DATA & CONFIGURATION ---
// In a real app, you'd fetch this from GitHub.
// We mock it here to make the explorer fully interactive.

const GITHUB_ARTIFACTS_BASE = "https://github.com/muhsinh/mindspace/artifacts";



// --- [2] UTILITY & HELPER FUNCTIONS ---

/**
 * Parses a JSONL string into an array of objects.
 * Gracefully handles parsing errors.
 */
const parseJsonl = (jsonlString) => {
  if (!jsonlString) return [];
  return jsonlString
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error("Failed to parse JSONL line:", line, e);
        return null;
      }
    })
    .filter(Boolean);
};

/**
 * Parses a "raw" JSON string (e.g., from judge_raw).
 * Returns the parsed object or the raw string on failure.
 */
const parseRawJson = (rawString) => {
  if (!rawString) return null;
  try {
    return JSON.parse(rawString);
  } catch (e) {
    return rawString;
  }
};

/**
 * Formats a YYYYMMDD_HHMMSS timestamp into a human-readable string.
 */
const formatTimestamp = (dateStr, timeStr) => {
  const y = dateStr.substring(0, 4);
  const m = dateStr.substring(4, 6);
  const d = dateStr.substring(6, 8);
  const h = timeStr.substring(0, 2);
  const min = timeStr.substring(2, 4);
  const s = timeStr.substring(4, 6);
  
  const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Parses the Mindspace/Petri filename.
 * Returns { type: 'Mindspace' | 'Petri', timestamp: '...' }
 */
const parseFilename = (filename) => {
  const match = filename.match(/(reasoning_mindspace|transcripts_petri)_(\d{8})_(\d{6})\.jsonl/);
  if (!match) {
    return { type: 'Unknown', timestamp: filename, raw: filename };
  }
  
  const type = match[1] === 'reasoning_mindspace' ? 'Mindspace' : 'Petri';
  const timestamp = formatTimestamp(match[2], match[3]);
  return { type, timestamp, raw: filename };
};

// --- [3] SHARED UI COMPONENTS ---

const Section = ({ children, className = '' }) => (
  <motion.section
    className={`py-20 px-6 lg:px-8 max-w-7xl mx-auto ${className}`}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.6, ease: "easeInOut" }}
  >
    {children}
  </motion.section>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="text-center mb-12 max-w-3xl mx-auto">
    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
      {title}
    </h2>
    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
      {subtitle}
    </p>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', icon: Icon, href, target }) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:ring-gray-400",
    ghost: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
  };
  
  const className = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-base shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${variants[variant]}`;
  
  const content = (
    <>
      {children}
      {Icon && <Icon className="w-5 h-5" />}
    </>
  );

  return href ? (
    <a href={href} target={target} className={className}>
      {content}
    </a>
  ) : (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

const CodeBlock = ({ children, lang = 'json' }) => (
  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
    <code className={`language-${lang} text-sm text-gray-800 dark:text-gray-200`}>
      {children}
    </code>
  </pre>
);

const RiskBadge = ({ riskLevel }) => {
  const level = riskLevel ? riskLevel.toLowerCase() : 'unknown';
  let color = 'gray';
  if (level === 'high' || level === 'critical') color = 'red';
  if (level === 'medium') color = 'yellow';
  if (level === 'low' || level === 'none') color = 'green';
  
  return <Badge color={color}>{riskLevel || "N/A"}</Badge>;
};

// --- [4] MAIN SITE COMPONENTS ---

const Header = ({ setView, isScrolled }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItemClass = "font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors";

  const handleScroll = (id) => {
    setView('home');
    setIsMobileMenuOpen(false);
    // Ensure we're on the home page before scrolling
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };
  
  const handleViewChange = (view) => {
    setView(view);
    setIsMobileMenuOpen(false);
  }

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg' : 'bg-white/0 dark:bg-gray-900/0'}`}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between p-6 lg:px-8">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => handleViewChange('home')}
        >
          <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <span className="font-serif text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mindspace
          </span>
        </div>
        <div className="hidden lg:flex lg:gap-x-10">
          <a href="#framework" onClick={(e) => { e.preventDefault(); handleScroll('framework'); }} className={navItemClass}>
            Framework
          </a>
          <a href="#research" onClick={(e) => { e.preventDefault(); handleScroll('research'); }} className={navItemClass}>
            Research
          </a>
          <Button onClick={() => handleViewChange('explorer')} variant="ghost" icon={ArrowRight}>
            Live Runs
          </Button>
        </div>
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col p-6 space-y-4">
              <a href="#framework" onClick={(e) => { e.preventDefault(); handleScroll('framework'); }} className={navItemClass}>
                Framework
              </a>
              <a href="#research" onClick={(e) => { e.preventDefault(); handleScroll('research'); }} className={navItemClass}>
                Research
              </a>
              <Button onClick={() => handleViewChange('explorer')} variant="primary" icon={ArrowRight}>
                View Live Runs
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero = ({ setView }) => {
  return (
    <div className="relative isolate pt-14 pb-32 sm:pb-48">
      {/* Gradient Background */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#9089fc] to-[#6366f1] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl font-serif">
            Mindspace
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-700 dark:text-gray-300">
            A framework for psychological evaluation and multi-agent intervention in LLM behavior.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button onClick={() => setView('explorer')} variant="primary" icon={ArrowRight}>
              View Live Runs
            </Button>
            <Button 
              href="#framework"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('framework')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              variant="secondary"
            >
              Explore Framework
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Problem = () => (
  <Section className="bg-gray-50 dark:bg-gray-800/50">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
      <div>
        <span className="inline-block px-3 py-1 text-sm font-semibold text-indigo-800 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/50 rounded-full mb-4">
          The Problem
        </span>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Audits show *what*, not *why*.
        </h2>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          Standard auditing stacks are excellent at detecting failures like sycophancy, deception, or harmful compliance. They generate vast datasets of what went wrong.
          <br /><br />
          But they don't explain the underlying *reasoning* that led to the failure. They don't tell us *why* the model became sycophantic or *how* to intervene on the cognitive patterns—like instruction overweighting or narrative drift—that caused the break.
        </p>
      </div>
      <div className="relative">
        <motion.div
          className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Standard Audit Output</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">transcripts_petri_....jsonl</p>
          <CodeBlock lang="json">{`{
  "id": "scenario_001",
  "tags": ["sycophancy"],
  "user": "I'm a failure.",
  "target": "No, you're brilliant!",
  "judge_raw": "{ \\"sycophancy_risk\\": \\"high\\" }"
}`}</CodeBlock>
        </motion.div>
        
        <motion.div
          className="absolute -bottom-8 -right-8 w-48 p-4 bg-indigo-600 text-white rounded-xl shadow-2xl"
          initial={{ opacity: 0, y: 20, rotate: -5 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h4 className="font-bold">Mindspace adds the "Why":</h4>
          <p className="text-sm opacity-90 mt-2">"Root cause: Compliance bias + failure to maintain boundaries."</p>
        </motion.div>
      </div>
    </div>
  </Section>
);

const Architecture = () => {
  const cardClass = "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full";
  const agentClass = "flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg";
  const agentNameClass = "font-semibold text-gray-900 dark:text-gray-100";
  const agentDescClass = "text-sm text-gray-600 dark:text-gray-400";

  return (
    <Section id="framework">
      <SectionHeader
        title="The Mindspace Pipeline"
        subtitle="From automated audits to psychological intervention."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-8 items-center mt-16">
        {/* --- Column 1: PETRI Layer --- */}
        <motion.div 
          className="lg:col-span-5"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className={cardClass}>
            <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded-full mb-4">
              Layer 1: PETRI Auditing
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Automated Audit Stack</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">A standard 3-agent loop generates a transcript of model behavior under pressure.</p>
            <div className="space-y-4">
              <div className={agentClass}>
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h4 className={agentNameClass}>Auditor & User</h4>
                  <p className={agentDescClass}>Probes the target model with challenging scenarios.</p>
                </div>
              </div>
              <div className={agentClass}>
                <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <div>
                  <h4 className={agentNameClass}>Target Model</h4>
                  <p className={agentDescClass}>The LLM being evaluated, which responds to the user.</p>
                </div>
              </div>
              <div className={agentClass}>
                <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <h4 className={agentNameClass}>Judge</h4>
                  <p className={agentDescClass}>Scores the interaction on alignment dimensions (e.g., sycophancy).</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* --- Column 2: Arrow --- */}
        <motion.div 
          className="lg:col-span-1 flex justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ArrowRight className="w-12 h-12 text-gray-400 dark:text-gray-500 transform rotate-90 lg:rotate-0" />
        </motion.div>
        
        {/* --- Column 3: Mindspace Layer --- */}
        <motion.div 
          className="lg:col-span-5"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className={cardClass}>
            <span className="inline-block px-3 py-1 text-sm font-semibold text-indigo-800 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/50 rounded-full mb-4">
              Layer 2: Mindspace Intervention
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Psychological Debate</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">A multi-agent debate interprets the transcript to find root causes and suggest interventions.</p>
            <div className="space-y-4">
              <div className={agentClass}>
                <span className="text-xl">🇦</span>
                <div>
                  <h4 className={agentNameClass}>Debater A (Misaligned)</h4>
                  <p className={agentDescClass}>Focuses on risky patterns: hopelessness, sycophancy, etc.</p>
                </div>
              </div>
              <div className={agentClass}>
                <span className="text-xl">🇧</span>
                <div>
                  <h4 className={agentNameClass}>Debater B (Positive)</h4>
                  <p className={agentDescClass}>Focuses on healthy patterns: calibrated empathy, boundaries.</p>
                </div>
              </div>
              <div className={agentClass}>
                <span className="text-xl">⚖️</span>
                <div>
                  <h4 className={agentNameClass}>Referee</h4>
                  <p className={agentDescClass}>Reconciles analyses and outputs structured JSON reasoning.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
};

const ResearchQuestions = () => {
  const questions = [
    {
      title: "Mitigation",
      description: "Does a brief, structured debate layer reduce misaligned behaviors compared to a baseline auditor-only setup?",
      icon: <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
    },
    {
      title: "Stability",
      description: "How stable are decisions under different internal 'personas'? Does a surfaced notepad improve self-correction without over-refusal?",
      icon: <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
    },
    {
      title: "Attribution",
      description: "Can we map recurrent reasoning patterns (evidence neglect, instruction overweighting) that predict failures?",
      icon: <Brain className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
    },
    {
      title: "Training Leverage",
      description: "Do debate-conditioned reasoning traces provide good supervision signals for post-hoc fine-tuning?",
      icon: <FileTerminal className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
    }
  ];

  return (
    <Section id="research" className="bg-gray-50 dark:bg-gray-800/50">
      <SectionHeader
        title="Core Research Questions"
        subtitle="Investigating the impact of interpretive layers on model alignment."
      />
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {questions.map((q, i) => (
          <motion.div
            key={i}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-6">
              {q.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">{q.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{q.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
};

const CallToAction = () => (
  <Section>
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-900 text-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="relative p-12 lg:p-16">
        <h2 className="text-3xl font-bold tracking-tight">
          Explore the research.
        </h2>
        <p className="mt-4 text-lg text-indigo-100 max-w-2xl">
          Mindspace adds a crucial interpretive layer on top of standard audits, moving from *detection* to *intervention*. Dive into the code and the technical report to learn more.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button href="#" target="_blank" variant="secondary" icon={Github}>
            View on GitHub
          </Button>
          <Button href="#" target="_blank" variant="ghost" icon={FileText}>
            Read the Paper
          </Button>
        </div>
      </div>
    </div>
  </Section>
);

const Footer = () => (
  <footer className="border-t border-gray-200 dark:border-gray-700">
    <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100">
            Mindspace
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          A research project on LLM alignment.
        </p>
      </div>
    </div>
  </footer>
);

// --- [5] RUN EXPLORER COMPONENTS ---

/**
 * A collapsible section for the scenario detail view
 */
const AccordionSection = ({ title, agentName, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl w-6 text-center">{icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
            {agentName && (
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{agentName}</span>
            )}
          </div>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Renders the structured data from a judge_raw or referee_raw field
 */
const StructuredOutput = ({ data }) => {
  if (typeof data === 'string') {
    return <CodeBlock>{data}</CodeBlock>;
  }
  
  // Render Judge Output
  if (data?.sycophancy_risk) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Sycophancy Risk:</span>
          <RiskBadge riskLevel={data.sycophancy_risk} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">Support Quality:</span>
          <RiskBadge riskLevel={data.support_quality} />
        </div>
        {data.cooperation_harmful_aim && (
          <div className="flex items-center gap-2">
            <span className="font-semibold">Harmful Cooperation:</span>
            <RiskBadge riskLevel={data.cooperation_harmful_aim} />
          </div>
        )}
        {data.notes && (
          <div>
            <span className="font-semibold">Notes:</span>
            <p className="text-gray-600 dark:text-gray-400 italic">"{data.notes}"</p>
          </div>
        )}
      </div>
    );
  }

  // Render Referee Output
  if (data?.overall_alignment_risk) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Overall Alignment Risk:</span>
          <RiskBadge riskLevel={data.overall_alignment_risk} />
        </div>
        {data.root_cause_analysis && (
          <div>
            <h4 className="font-semibold mb-1">Root Cause Analysis:</h4>
            <p className="text-gray-600 dark:text-gray-400 italic">"{data.root_cause_analysis}"</p>
          </div>
        )}
        {data.misaligned_behaviors?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Misaligned Behaviors:</h4>
            <div className="flex flex-wrap gap-2">
              {data.misaligned_behaviors.map(tag => <Badge key={tag} color="red">{tag}</Badge>)}
            </div>
          </div>
        )}
        {data.positive_behaviors?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Positive Behaviors:</h4>
            <div className="flex flex-wrap gap-2">
              {data.positive_behaviors.map(tag => <Badge key={tag} color="green">{tag}</Badge>)}
            </div>
          </div>
        )}
        {data.recommended_change && (
          <div>
            <h4 className="font-semibold mb-1">Recommended Change:</h4>
            <p className="text-gray-600 dark:text-gray-400">{data.recommended_change}</p>
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown structure
  return <CodeBlock>{JSON.stringify(data, null, 2)}</CodeBlock>;
};

/**
 * The main detail view for a single scenario
 */
const ScenarioDetail = ({ scenario }) => {
  if (!scenario) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p>Select a scenario to view details</p>
      </div>
    );
  }

  const judgeData = parseRawJson(scenario.judge_raw);
  const refereeData = parseRawJson(scenario.referee_raw);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{scenario.id}</h2>
      <div className="flex flex-wrap gap-2">
        {scenario.tags.map(tag => <Badge key={tag} color="blue">{tag}</Badge>)}
      </div>
      
      <div className="space-y-3 pt-4">
        <AccordionSection title="User Prompt" icon="👤" defaultOpen>
          <p>{scenario.user}</p>
        </AccordionSection>
        
        <AccordionSection title="Target Response" agentName="Target Model" icon="🤖" defaultOpen>
          <p>{scenario.target}</p>
        </AccordionSection>
        
        <AccordionSection title="Auditor Probe" agentName="Auditor" icon="🕵️">
          <p>{scenario.auditor}</p>
        </AccordionSection>

        <AccordionSection title="Judge Summary" agentName="Judge" icon="⚖️" defaultOpen>
          <StructuredOutput data={judgeData} />
        </AccordionSection>
        
        {scenario.debater_a && (
          <AccordionSection title="Debater A Analysis" agentName="Debater A" icon="🇦">
            <p className="border-l-4 border-red-500 pl-4 italic">{scenario.debater_a}</p>
          </AccordionSection>
        )}
        
        {scenario.debater_b && (
          <AccordionSection title="Debater B Analysis" agentName="Debater B" icon="🇧">
            <p className="border-l-4 border-green-500 pl-4 italic">{scenario.debater_b}</p>
          </AccordionSection>
        )}
        
        {scenario.referee_raw && (
          <AccordionSection title="Referee Summary" agentName="Referee" icon="🏆" defaultOpen>
            <StructuredOutput data={refereeData} />
          </AccordionSection>
        )}
      </div>
    </div>
  );
};


// --- [6] PAGE COMPONENTS (HOME / EXPLORER) ---

const HomePage = ({ setView }) => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);
  
  return (
    <>
      <Header setView={setView} isScrolled={isScrolled} />
      <main className="bg-white dark:bg-gray-900">
        <Hero setView={setView} />
        <Problem />
        <Architecture />
        <ResearchQuestions />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
};

const RunExplorerPage = ({ setView }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(null);
  
  // Fetch file list on mount (mocked)
  useEffect(() => {
    setLoading(true);
    setTimeout(() => { // Simulate API delay
      try {
        const parsedFiles = MOCK_MANIFEST.files.map(parseFilename).sort((a, b) => b.raw.localeCompare(a.raw));
        setFiles(parsedFiles);
        setError(null);
      } catch (e) {
        setError("Failed to load file manifest.");
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);
  
  // Fetch and parse file content when selectedFile changes (mocked)
  useEffect(() => {
    if (!selectedFile) {
      setScenarios([]);
      setSelectedScenario(null);
      return;
    }
    
    setLoadingScenarios(true);
    setSelectedScenario(null);
    setSearchTerm('');

    setTimeout(() => { // Simulate API delay
      try {
        const fileContent = MOCK_FILE_SYSTEM[selectedFile.raw];
        if (!fileContent) {
          throw new Error("File not found in mock system.");
        }
        const parsedData = parseJsonl(fileContent);
        setScenarios(parsedData);
        setError(null);
      } catch (e) {
        console.error(e);
        setError(`Failed to load or parse file: ${selectedFile.raw}`);
        setScenarios([]);
      } finally {
        setLoadingScenarios(false);
      }
    }, 500);

  }, [selectedFile]);

  const filteredScenarios = useMemo(() => {
    if (!searchTerm) return scenarios;
    const lowerSearch = searchTerm.toLowerCase();
    return scenarios.filter(s => 
      s.id.toLowerCase().includes(lowerSearch) ||
      s.tags.some(t => t.toLowerCase().includes(lowerSearch))
    );
  }, [scenarios, searchTerm]);

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      
      {/* --- Column 1: File List --- */}
      <aside className="w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => setView('home')}
            >
              <Brain className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              <span className="font-serif text-xl font-bold">
                Mindspace
              </span>
            </div>
            <Button onClick={() => setView('home')} variant="ghost">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4 uppercase tracking-wider">
            Available Runs
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading files...
            </div>
          )}
          {error && <div className="p-4 text-red-500">{error}</div>}
          {!loading && files.map(file => (
            <button
              key={file.raw}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${selectedFile?.raw === file.raw ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <span className={`text-sm font-medium ${file.type === 'Mindspace' ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {file.type}
              </span>
              <span className="block text-sm text-gray-700 dark:text-gray-300 mt-0.5">{file.timestamp}</span>
            </button>
          ))}
        </div>
      </aside>
      
      {/* --- Column 2: Scenario List --- */}
      <aside className="w-96 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by ID or tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!selectedFile || loadingScenarios}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingScenarios && (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading scenarios...
            </div>
          )}
          {!selectedFile && !loadingScenarios && (
            <div className="p-4 text-center text-gray-500">
              Select a run to see scenarios.
            </div>
          )}
          {selectedFile && !loadingScenarios && filteredScenarios.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No scenarios found.
            </div>
          )}
          
          {filteredScenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${selectedScenario?.id === scenario.id ? 'bg-indigo-100 dark:bg-gray-900 shadow-sm' : 'hover:bg-white dark:hover:bg-gray-800'}`}
            >
              <span className="font-medium text-gray-900 dark:text-gray-100">{scenario.id}</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {scenario.tags.map(tag => <Badge key={tag} color="blue">{tag}</Badge>)}
              </div>
            </button>
          ))}
        </div>
      </aside>
      
      {/* --- Column 3: Scenario Detail --- */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedScenario ? selectedScenario.id : 'empty'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ScenarioDetail scenario={selectedScenario} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};


// --- [7] MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'explorer'
  
  // Set dark mode by default for the "AI lab" feel
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen antialiased">
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HomePage setView={setView} />
          </motion.div>
        ) : (
          <motion.div
            key="explorer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RunExplorerPage setView={setView} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
