import React, { useState, useEffect } from 'react';
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

export default function SectionNav() {
  const [activeSection, setActiveSection] = useState('overview');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(progress);

      const sectionElements = SECTIONS.map((s) => ({
        id: s.id,
        el: document.getElementById(s.id),
      })).filter((s) => s.el);

      const scrollPosition = window.scrollY + 200;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const { id, el } = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      {/* Scroll progress bar */}
      <div
        className="h-0.5 bg-blue-600 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2.5 custom-scrollbar text-xs font-mono">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
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
