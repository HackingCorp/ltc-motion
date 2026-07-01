import type { MappedEase, MotionEase } from "./types";

const NAMED_EASE: Record<string, string> = {
  linear: "none",
  ease: "power1.inOut",
  easein: "power2.in",
  easeout: "power2.out",
  easeinout: "power2.inOut",
  easeinandout: "power2.inOut",
  backin: "back.in",
  backout: "back.out",
  backinout: "back.inOut",
  backinandout: "back.inOut",
  hold: "steps(1)",
};

export function mapEase(ease: MotionEase): MappedEase {
  if (Array.isArray(ease)) return { kind: "bezier", bezier: ease };
  const key = ease.toLowerCase().replace(/[_\s-]/g, "");
  return { kind: "named", ease: NAMED_EASE[key] ?? "none" };
}
