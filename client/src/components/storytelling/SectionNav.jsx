import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  GitBranch,
  GitMerge,
  Workflow,
  Clock,
  Code2,
  AlertTriangle,
  Activity,
  Cpu,
  ShieldCheck,
  Map,
} from 'lucide-react';

const SECTIONS = [
  { id: 'overview', label: '01 Overview', icon: Layers },
  { id: 'how-it-works', label: '02 How It Works', icon: GitBranch },
  { id: 'master-flow', label: '03 Master Flow', icon: Workflow },
  { id: 'matching-engine', label: '04 Matching Engine', icon: GitMerge },
  { id: 'multi-pass', label: '05 Multi-Pass', icon: Clock },
  { id: 'data-transformation', label: '06 Data Transform', icon: Code2 },
  { id: 'exceptions', label: '07 Exception Flow', icon: AlertTriangle },
  { id: 'results', label: '08 Results & Ops', icon: Activity },
  { id: 'architecture', label: '09 Architecture', icon: Cpu },
  { id: 'verification', label: '10 Verification', icon: ShieldCheck },
  { id: 'system-map', label: '11 System Map', icon: Map },
];

const HEADER_OFFSET = 120; // Sticky top navbar + sub-nav header offset

export default function SectionNav() {
  const [activeSection, setActiveSection] = useState('overview');
  const [scrollProgress, setScrollProgress] = useState(0);
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef(null);
  const buttonRefs = useRef({});

  // Auto-scroll active sub-nav tab into view horizontally (especially for mobile/overflow)
  useEffect(() => {
    const activeBtn = buttonRefs.current[activeSection];
    if (activeBtn && activeBtn.scrollIntoView) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeSection]);

  const updateActiveSection = useCallback(() => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
    setScrollProgress(progress);

    // If scroll was triggered by explicit tab click, skip scroll-spy evaluation during animation
    if (isClickScrollingRef.current) return;

    const sectionElements = SECTIONS.map((s) => ({
      id: s.id,
      el: document.getElementById(s.id),
    })).filter((s) => s.el);

    if (sectionElements.length === 0) return;

    // Check if scrolled near absolute bottom of page
    const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 20;
    if (isAtBottom) {
      setActiveSection(sectionElements[sectionElements.length - 1].id);
      return;
    }

    let currentActive = sectionElements[0].id;

    for (let i = 0; i < sectionElements.length; i++) {
      const { id, el } = sectionElements[i];
      const rect = el.getBoundingClientRect();

      // Section top boundary check relative to sticky header offset
      if (rect.top <= HEADER_OFFSET + 180) {
        currentActive = id;
      } else {
        break;
      }
    }

    setActiveSection(currentActive);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      updateActiveSection();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveSection();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [updateActiveSection]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;

    // Set active section immediately as single source of truth
    setActiveSection(id);
    isClickScrollingRef.current = true;

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = Math.max(0, elementTop - HEADER_OFFSET);

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    // Re-enable scroll listener after smooth scroll finishes (~800ms)
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
      updateActiveSection();
    }, 850);
  };

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      {/* Scroll progress bar */}
      <div
        className="h-0.5 bg-blue-600 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2.5 custom-scrollbar text-xs font-mono scroll-smooth">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                ref={(el) => (buttonRefs.current[sec.id] = el)}
                onClick={() => scrollToSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-transparent'
                }`}
              >
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

