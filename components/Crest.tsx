import Image from "next/image";

export function Crest({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: "relative" }}>
      <Image
        src="/data/Logo_cutout.png"
        alt="Escut del CF Juneda"
        fill
        sizes="120px"
        style={{ objectFit: "contain" }}
        priority
      />
    </div>
  );
}
