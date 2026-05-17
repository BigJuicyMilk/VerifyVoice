/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AudioLines, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  Mic, 
  History as HistoryIcon, 
  GraduationCap, 
  ScrollText, 
  Search, 
  QrCode, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
  Pause,
  AlertCircle,
  LucideIcon
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
type Screen = 'check' | 'results' | 'history' | 'talk' | 'learn';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

// --- Components ---

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center transition-all duration-300 px-6 py-2 rounded-full",
      active 
        ? "bg-primary text-white scale-110 shadow-lg -translate-y-2" 
        : "text-on-surface/60 hover:bg-surface-container-low"
    )}
  >
    <Icon className={cn("w-6 h-6", active && "fill-current")} />
    <span className="text-[10px] uppercase tracking-widest font-bold mt-1">{label}</span>
  </button>
);

const Header = ({ audioOn, setAudioOn }: { audioOn: boolean; setAudioOn: (v: boolean) => void }) => (
  <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 h-20 bg-[#f9f9ff]/80 backdrop-blur-md">
    <div className="flex items-center gap-3">
      <div className="text-primary">
        <AudioLines className="w-8 h-8" />
      </div>
      <h1 className="font-bold text-2xl tracking-tighter text-primary">Verify Voice</h1>
    </div>
    <button 
      onClick={() => setAudioOn(!audioOn)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold transition-all active:scale-95 shadow-lg",
        audioOn ? "bg-primary" : "bg-secondary-container"
      )}
    >
      {audioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      <span className="tracking-widest text-sm uppercase">Audio {audioOn ? 'On' : 'Off'}</span>
    </button>
  </header>
);

// --- Screen Views ---

const ScannerView = ({ onScan }: { onScan: () => void }) => (
  <div className="flex flex-col items-center pt-8 pb-32 px-6 max-w-4xl mx-auto w-full">
    <div className="text-center mb-10">
      <h2 className="text-5xl font-black leading-tight text-on-surface mb-4">Check a Product</h2>
      <p className="text-xl font-medium text-on-surface-variant max-w-2xl mx-auto">
        Point your camera at a product or its label to see if it is a good choice for you.
      </p>
    </div>

    <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-surface-container-highest group">
      <img 
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwhSpG4NvYRhIk4eBtMwVuL6a4QW3c6sUnd5U0ymM9ozkMeMmj33aqASyNWfnsQHiwK_arXrfmaj-hRoWlbVq3la1QogCalHxt3wxWvI2x_3m2jq6m9NbaDAIAHywuuT8sxkny_bs10LBTy0YIfxFHkW4Yb2Bbzj97qtygtWqfEtqq-N8PvWERzZi0ZNs3d8YN1Lj0E80bnU9o2ffJNu5HX5UgrUh8O3LvTS3Dm57bHlTdDqJEJphb-N0u2Eal_hIawuI42ywzEz-t" 
        alt="Scanner View" 
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/20">
        <div className="relative w-72 h-72 border-4 border-white/40 rounded-3xl">
          <div className="absolute -top-1 -left-1 w-10 h-10 border-t-8 border-l-8 border-yellow-400 rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-10 h-10 border-t-8 border-r-8 border-yellow-400 rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-8 border-l-8 border-yellow-400 rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-8 border-r-8 border-yellow-400 rounded-br-xl" />
          
          {/* Scan Line Animation */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-yellow-400 shadow-[0_0_15px_#facc15] z-10"
          />
        </div>
        
        <div className="mt-12 bg-black/60 backdrop-blur-md px-8 py-3 rounded-full border border-white/20">
          <p className="text-white font-bold text-lg">Align label within the frame</p>
        </div>
      </div>

      <div className="absolute bottom-10 left-6 right-6 z-20">
        <button 
          onClick={onScan}
          className="bg-gradient-to-br from-primary to-primary-container text-white w-full h-20 rounded-2xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-transform"
        >
          <QrCode className="w-8 h-8" />
          <span className="text-2xl font-bold">Scan Now</span>
        </button>
      </div>
    </div>

    <div className="mt-12 flex flex-col items-center gap-6 w-full">
      <button className="flex items-center gap-4 bg-gradient-to-r from-primary to-secondary-container text-white px-10 py-5 rounded-full shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all group">
        <Mic className="w-8 h-8 animate-pulse" />
        <span className="text-2xl font-bold">Talk to me instead</span>
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-6">
        <div className="bg-yellow-100/50 p-8 rounded-3xl border-l-[12px] border-yellow-400">
          <h3 className="text-2xl font-black text-yellow-900 mb-2">Trouble scanning?</h3>
          <p className="text-lg text-yellow-800">Check your product manually by typing its name below.</p>
        </div>
        <div className="bg-surface-container-low p-8 rounded-3xl flex flex-col gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="e.g. Oat Milk" 
              className="w-full h-16 bg-white rounded-2xl px-6 text-xl border-none focus:ring-4 focus:ring-primary/20"
            />
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
          </div>
          <button className="h-16 w-full rounded-2xl font-bold text-xl bg-white border-2 border-primary/10 text-primary hover:bg-primary/5 transition-colors">
            Search Manually
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ResultsView = () => (
  <div className="pt-8 pb-32 px-6 max-w-4xl mx-auto w-full space-y-8">
    <div className="bg-primary-container text-white p-8 rounded-3xl flex items-center justify-between shadow-2xl overflow-hidden relative">
      <div className="space-y-1 z-10">
        <span className="text-on-primary-container text-sm font-black uppercase tracking-widest opacity-80">Currently Playing</span>
        <h2 className="text-4xl font-black">Reading Aloud...</h2>
      </div>
      <div className="flex gap-2 items-end h-16 z-10">
        <motion.div animate={{ height: [20, 48, 24] }} transition={{ repeat: Infinity, duration: 0.8 }} className="audio-wave-bar bg-white/40" />
        <motion.div animate={{ height: [30, 64, 40] }} transition={{ repeat: Infinity, duration: 0.6 }} className="audio-wave-bar bg-white" />
        <motion.div animate={{ height: [15, 32, 20] }} transition={{ repeat: Infinity, duration: 0.9 }} className="audio-wave-bar bg-white/60" />
        <motion.div animate={{ height: [25, 56, 30] }} transition={{ repeat: Infinity, duration: 0.7 }} className="audio-wave-bar bg-white/80" />
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
    </div>

    <section className="bg-surface-container-low rounded-3xl p-10 flex flex-col items-center text-center space-y-8">
      <div className="w-24 h-24 bg-tertiary rounded-full flex items-center justify-center shadow-2xl shadow-tertiary/20">
        <CheckCircle className="text-white w-14 h-14" />
      </div>
      <div className="space-y-3">
        <h3 className="text-5xl font-black text-on-surface tracking-tight">Safe to Use</h3>
        <p className="text-on-surface-variant text-2xl font-medium">This product meets all safety standards for your profile.</p>
      </div>
      <button className="bg-primary text-white px-12 py-6 rounded-full flex items-center gap-4 text-2xl font-bold hover:bg-primary-container transition-all active:scale-95 shadow-xl">
        <Mic className="w-8 h-8" />
        Listen to Summary
      </button>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 flex flex-col h-full ring-1 ring-black/5">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <Zap className="w-8 h-8 text-primary" />
            <h4 className="text-3xl font-black">Ingredients</h4>
          </div>
          <button className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary active:scale-90 transition-transform">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
        <ul className="space-y-4 flex-grow">
          {['Purified Water', 'Organic Aloe Vera', 'Vitamin E Acetate'].map((item) => (
            <li key={item} className="flex items-center gap-4 p-5 bg-surface-container-low rounded-2xl transition-all hover:translate-x-2">
              <div className="w-4 h-4 rounded-full bg-tertiary" />
              <span className="text-xl font-bold text-on-surface">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 flex flex-col h-full ring-1 ring-black/5">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-tertiary" />
            <h4 className="text-3xl font-black">Benefits</h4>
          </div>
          <button className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center text-primary active:scale-90 transition-transform">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
        <p className="text-xl font-medium leading-relaxed text-on-surface-variant mb-8">
          Provides deep hydration for sensitive skin. The organic components promote natural healing and barrier repair without harsh chemicals.
        </p>
        <div className="mt-auto">
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhIbw6seAdEH4ZVXuChYiZF9K0OyPaEi65MX4lwJpj1ju2NrlRrgFvqkHi6bnk_Px1tH-SxlXutOQCE1r5fU6_YPVR62faYoOFjsoDdlFI-jqL9VuzqzrI3wFRPVqyPpEpeWnFsLFZtCXzdzcpwm6NF9nGNm4mlOgsv9xhaUe38ZTaAz12cvDXgkBe2NGqs7DFPPbCgGVMQx3rydVqmg_fsMSTtbdsA5lY8U-lITkGKad6dUezPsExlP_5dn8ZxeXnR5UL6WYmgf0W" 
            alt="Product visual" 
            className="w-full h-48 object-cover rounded-2xl shadow-inner"
          />
        </div>
      </div>
    </div>

    <div className="bg-surface-container-highest/30 p-10 rounded-3xl flex flex-col md:flex-row items-center gap-12 border border-primary/10">
      <div className="flex-1 space-y-8">
        <div className="flex items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-primary" />
          <h4 className="text-4xl font-black">Safety Check</h4>
        </div>
        <p className="text-2xl font-bold text-on-surface leading-tight">
          Our AI analysis confirms no allergens detected based on your medical history. This product is 100% compatible with your "Sensitive Skin" profile.
        </p>
        <button className="bg-primary text-white px-10 py-5 rounded-full flex items-center gap-4 font-black transition-all active:scale-95 shadow-xl hover:shadow-primary/40">
          <Mic className="w-7 h-7" />
          HEAR DETAILED SAFETY REPORT
        </button>
      </div>
      <div className="w-full md:w-1/3">
        <div className="aspect-square bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 ring-1 ring-black/5">
          <div className="text-8xl font-black text-tertiary">0</div>
          <div className="text-sm font-black uppercase tracking-widest text-on-surface-variant">Harmful Chemicals Found</div>
          <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden mt-4">
            <motion.div initial={{ width: 0 }} animate={{ width: '0%' }} className="h-full bg-tertiary" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LearnView = () => (
  <div className="pt-8 pb-32 px-6 max-w-5xl mx-auto w-full space-y-12">
    <div className="flex items-center gap-6 p-8 bg-surface-container-low rounded-3xl border-l-[12px] border-primary animate-pulse">
      <Mic className="w-10 h-10 text-primary" />
      <p className="text-2xl font-bold text-primary italic leading-tight">Reading this guide aloud for you...</p>
    </div>

    <section>
      <h2 className="text-6xl md:text-8xl font-black text-on-surface leading-none tracking-tighter mb-6">
        How to spot <br/><span className="text-primary italic font-serif">a fake.</span>
      </h2>
      <p className="text-3xl text-on-surface-variant max-w-2xl leading-tight font-medium">
        Stay safe by knowing the signs of a voice scam. We've made it simple to hear and learn.
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {[
        { 
          id: '01', 
          title: 'Too Good to be True', 
          color: 'bg-surface-container-high', 
          text: 'If someone offers you free money or prizes over the phone, it is almost always a scam. Scammers use excitement to stop you from thinking clearly.',
          iconColor: 'bg-primary'
        },
        { 
          id: '02', 
          title: 'Hidden Fees', 
          color: 'bg-secondary-fixed', 
          text: 'Requests for "processing fees" or "shipping costs" before you get your prize are a huge red flag. Legitimate companies don\'t ask for payment like this.',
          iconColor: 'bg-secondary'
        },
        { 
          id: '03', 
          title: 'Urgent Tone', 
          color: 'bg-primary-fixed', 
          text: 'Scammers create a "crisis" to make you act fast. "Your bank account is locked" or "You owe taxes." Take a deep breath. Real companies give you time.',
          fullWidth: true,
          isUrgent: true,
          iconColor: 'bg-primary'
        },
        { 
          id: '04', 
          title: 'Unusual Payment', 
          color: 'bg-surface-container-highest', 
          text: 'Be wary if someone asks for payment via Gift Cards, Wire Transfers, or Cryptocurrency. These are nearly impossible to trace or get back.',
          iconColor: 'bg-primary'
        },
        { 
          id: '05', 
          title: 'Impersonation', 
          color: 'bg-white border-2 border-primary/5', 
          text: 'They might sound like your grandson or a police officer. AI can mimic voices. Always hang up and call the person back on their known number.',
          iconColor: 'bg-primary-container'
        }
      ].map((card) => (
        <div 
          key={card.id} 
          className={cn(
            "group relative overflow-hidden rounded-3xl p-10 flex flex-col justify-between min-h-[450px] transition-all hover:shadow-2xl hover:-translate-y-2",
            card.color,
            card.fullWidth && "md:col-span-2 md:flex-row md:items-center gap-12"
          )}
        >
          <div className={cn("absolute top-0 right-0 p-8", card.fullWidth && "relative md:order-last p-0")}>
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer",
              card.isUrgent ? "bg-white" : card.iconColor
            )}>
              {card.isUrgent ? <Pause className="w-12 h-12 text-primary" /> : <Play className="w-12 h-12 text-white" />}
            </div>
          </div>
          <div className="flex-1">
            <span className="inline-block px-5 py-1.5 bg-primary/10 text-primary font-black rounded-full mb-8 uppercase tracking-widest text-sm">Signal {card.id}</span>
            <h3 className={cn("text-5xl font-black mb-6 leading-none tracking-tighter", card.isUrgent ? "text-primary" : "text-on-surface")}>
              {card.title}
            </h3>
            <p className={cn("text-2xl font-medium leading-tight", card.isUrgent ? "text-primary/70" : "text-on-surface-variant")}>
              {card.text}
            </p>
            <div className="flex items-center gap-3 mt-10">
              <span className={cn("flex h-4 w-4 rounded-full", card.isUrgent ? "bg-primary animate-pulse" : "bg-tertiary")} />
              <span className={cn("font-black uppercase tracking-[0.2em] text-xs", card.isUrgent ? "text-primary" : "text-tertiary")}>
                {card.isUrgent ? "Voice analysis active" : "Ready to play"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <section className="text-center pb-12">
      <div className="inline-block p-16 bg-surface-container-high rounded-[4rem] max-w-4xl shadow-2xl border border-white/50">
        <ShieldCheck className="w-20 h-20 text-tertiary mx-auto mb-8" />
        <h4 className="text-5xl font-black mb-6 tracking-tighter">You are doing great.</h4>
        <p className="text-2xl font-medium text-on-surface-variant mb-12 leading-tight">
          Learning these simple rules makes you a harder target for scammers. Knowledge is your best shield.
        </p>
        <button className="bg-primary text-white text-2xl font-black py-8 px-16 rounded-full shadow-2xl active:scale-95 transition-transform hover:shadow-primary/40">
          Finish Guide
        </button>
      </div>
    </section>
  </div>
);

// --- Main App ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('check');
  const [audioOn, setAudioOn] = useState(true);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'check': return <ScannerView onScan={() => setCurrentScreen('results')} />;
      case 'results': return <ResultsView />;
      case 'learn': return <LearnView />;
      case 'history': return (
        <div className="flex flex-col items-center justify-center h-[70vh] px-10 text-center">
          <HistoryIcon className="w-24 h-24 text-primary/20 mb-8" />
          <h2 className="text-4xl font-black mb-4">No History Yet</h2>
          <p className="text-xl text-on-surface-variant">Products you scan will appear here.</p>
        </div>
      );
      case 'talk': return (
        <div className="flex flex-col items-center justify-center h-[70vh] px-10 text-center">
          <div className="relative mb-12">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-primary rounded-full blur-3xl"
            />
            <div className="relative w-48 h-48 bg-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(51,36,188,0.5)]">
              <Mic className="w-20 h-20 text-white" />
            </div>
          </div>
          <h2 className="text-5xl font-black mb-4">I'm Listening</h2>
          <p className="text-2xl text-on-surface-variant">Ask me anything about your product.</p>
        </div>
      );
      default: return <ScannerView onScan={() => setCurrentScreen('results')} />;
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <Header audioOn={audioOn} setAudioOn={setAudioOn} />
      
      <main className="pt-24 min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-4 pb-8 pt-4 bg-white/90 backdrop-blur-xl border-t border-primary/10 rounded-t-[48px] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <NavItem 
          icon={CheckCircle} 
          label="Check" 
          active={currentScreen === 'check' || currentScreen === 'results'} 
          onClick={() => setCurrentScreen('check')} 
        />
        <NavItem 
          icon={HistoryIcon} 
          label="History" 
          active={currentScreen === 'history'} 
          onClick={() => setCurrentScreen('history')} 
        />
        <NavItem 
          icon={Mic} 
          label="Talk" 
          active={currentScreen === 'talk'} 
          onClick={() => setCurrentScreen('talk')} 
        />
        <NavItem 
          icon={GraduationCap} 
          label="Learn" 
          active={currentScreen === 'learn'} 
          onClick={() => setCurrentScreen('learn')} 
        />
      </nav>
    </div>
  );
}
