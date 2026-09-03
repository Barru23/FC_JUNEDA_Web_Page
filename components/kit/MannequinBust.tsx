"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * A procedural shop-display bust — no model to source, nothing to license.
 * It exists only to give the garment shoulders and to hide the empty neck
 * opening, so it stays matte, dark, and mostly out of sight under the shirt.
 * A lathe torso + a short neck stub; no separate arm geometry — the sleeve
 * openings are left as dark hollows rather than risk visibly detached
 * "floating" limb stubs.
 */
export function MannequinBust() {
  // Profile measured against the actual optimized mesh: after KitViewer3D's
  // 5.5x scale and re-centering, the shirt spans roughly x:±1.44, y:±1.72,
  // z:±0.69 (see the plan's asset-budget notes for how these were measured).
  // Kept well inside that envelope — this bust must never poke past the
  // collar or hem.
  const torsoGeometry = useMemo(() => {
    const profile = [
      [0.72, -1.6],
      [0.88, -1.35],
      [0.95, -0.9],
      [0.97, -0.4],
      [0.95, 0.1],
      [0.96, 0.5],
      [0.98, 0.8], // chest
      [0.9, 1.05],
      [0.6, 1.25], // shoulder taper
      [0.24, 1.34], // collar base — neck cylinder continues from here
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(profile, 32);
  }, []);

  // A short stub — just enough to keep the collar opening from reading as a
  // black hole straight through to the inside-fabric material, never
  // intended to reach the shirt's own neckline.
  const neckGeometry = useMemo(() => new THREE.CylinderGeometry(0.22, 0.24, 0.22, 24), []);

  return (
    // LatheGeometry revolves the profile into a CIRCULAR cross-section, but
    // the real shirt is much shallower front-to-back (depth ±0.69) than it
    // is wide (±1.44) — a true circle at these radii pokes straight through
    // the front and back fabric. Squashing Z flattens the bust into the same
    // elliptical shape as the garment, so it stays safely inside the shell.
    <group renderOrder={-1} scale={[1, 1, 0.42]}>
      <mesh geometry={torsoGeometry}>
        <meshStandardMaterial color="#1c1c1f" roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={neckGeometry} position={[0, 1.42, 0]}>
        <meshStandardMaterial color="#1c1c1f" roughness={0.92} metalness={0} />
      </mesh>
    </group>
  );
}
