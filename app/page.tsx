"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Loader } from "@/components/Loader";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { BentoGrid } from "@/components/BentoGrid";
import { EventsSection } from "@/components/EventsSection";
import { ShopSection } from "@/components/ShopSection";
import { SocisSection } from "@/components/SocisSection";
import { TacticalPitchRoster } from "@/components/roster/TacticalPitchRoster";
import { Footer } from "@/components/Footer";

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <AmbientBackground />
      <Nav crestRevealed={!loading} />

      <AnimatePresence>
        {loading && <Loader onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.6, delay: loading ? 0 : 0.2 }}
      >
        <Hero />
        <BentoGrid />
        <ShopSection />
        <EventsSection />
        <SocisSection />
        <TacticalPitchRoster />
        <Footer />
      </motion.main>
    </>
  );
}
