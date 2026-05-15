import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import Pain from "@/components/sections/Pain";
import Stepper from "@/components/sections/Stepper";
import Stats from "@/components/sections/Stats";
import ToolGallery from "@/components/sections/ToolGallery";
import CtaFinal from "@/components/sections/CtaFinal";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pain />
        <Stepper />
        <Stats />
        <ToolGallery />
        <CtaFinal />
      </main>
    </>
  );
}
