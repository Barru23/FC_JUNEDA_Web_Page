// scripts/optimize-kit.mjs
//
// Strips every trace of the donor "Spain kit" GLB down to bare geometry, then
// re-compresses it. Run with: node scripts/optimize-kit.mjs
//
// Why this exists: assets/web-sources/tshirt.glb is a 13.16 MB export of a Spain
// football kit. Only its MESH (a real cloth-sim t-shirt with genuine fabric
// folds) is reused — every embedded image, material and the two unused
// per-vertex colour sets are Spain-specific or dead weight, and are removed
// here. This experiment is kept as source material but is not served publicly;
// the current shop deliberately uses the faster 2D product viewer.
//
// Source primitives (inspected via a raw GLB JSON-chunk dump, not this
// script): one mesh, 8 primitives sharing 8 materials —
//   T-Shirt_Inside (192k tris), Label_Body (240), Label_Neck (240),
//   T-Shirt_Outside (153k tris), Material.001 seams (30.8k),
//   Material.002 gold accent (9.8k), Empty (2, hidden RFEF-adjacent quad),
//   Empty.002 (2, hidden RFEF crest quad).

import { NodeIO } from "@gltf-transform/core";
import {
  KHRMaterialsSpecular,
  KHRMaterialsIOR,
  EXTMeshoptCompression,
} from "@gltf-transform/extensions";
import { weld, simplifyPrimitive, meshopt, prune, dedup } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "assets", "web-sources", "tshirt.glb");
const OUT = path.join(__dirname, "..", "assets", "web-sources", "kit-juneda.glb");

// Per-material simplification budget. T-Shirt_Outside is simplified
// conservatively — those triangles are the visible fabric folds. Inside is
// barely seen and simplified hard. Seams/accent get a moderate cut. Labels
// are already tiny (240 tris) and left untouched.
const SIMPLIFY_BUDGET = {
  "T-Shirt_Inside": { ratio: 0.15, error: 0.02 },
  "T-Shirt_Outside": { ratio: 0.55, error: 0.01 },
  "Material.001": { ratio: 0.5, error: 0.015 }, // seams/stitching
  "Material.002": { ratio: 0.5, error: 0.015 }, // gold accent
};

// Primitives that only exist to carry the two Spain-specific logo images and
// therefore are not part of the reusable cloth geometry.
const HIDDEN_LOGO_MATERIALS = new Set(["Empty", "Empty.002"]);

async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;

  const io = new NodeIO()
    .registerExtensions([KHRMaterialsSpecular, KHRMaterialsIOR, EXTMeshoptCompression])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

  const document = await io.read(SRC);
  const root = document.getRoot();

  console.log("--- source ---");
  report(document);

  // 1. Drop the two hidden Spain-logo quads entirely (primitive + material).
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      if (mat && HIDDEN_LOGO_MATERIALS.has(mat.getName())) {
        mesh.removePrimitive(prim);
        prim.dispose();
      }
    }
  }

  // 2. Every remaining material gets its donor textures cleared so this
  // archived experiment contains only reusable geometry. This also detaches the last
  // material still pointing at an embedded image (T-Shirt_Outside's
  // specular-color map), so prune() can drop the images below.
  for (const mat of root.listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setMetallicRoughnessTexture(null);
    mat.setNormalTexture(null);
    mat.setOcclusionTexture(null);
    mat.setEmissiveTexture(null);
    const specular = mat.getExtension("KHR_materials_specular");
    if (specular) specular.setSpecularColorTexture(null);
  }

  // 3. Strip the two unused per-vertex colour sets from every remaining
  // primitive — nothing reads COLOR_0/COLOR_1 (materials are replaced
  // wholesale at runtime), and on this mesh they are pure dead weight.
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of ["COLOR_0", "COLOR_1"]) {
        const attr = prim.getAttribute(semantic);
        if (attr) {
          prim.setAttribute(semantic, null);
          if (attr.listParents().length === 0) attr.dispose();
        }
      }
    }
  }

  // 4. Weld (merge duplicate vertices so simplification isn't blocked by
  // split UV/normal seams), then simplify each primitive by its own budget.
  await document.transform(weld({}));

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const budget = mat && SIMPLIFY_BUDGET[mat.getName()];
      if (!budget) continue;
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ...budget });
    }
  }

  // 5. Clean up everything the steps above orphaned (accessors, the 3
  // embedded images, now-unused materials) and dedupe identical materials.
  await document.transform(dedup(), prune());

  console.log("--- after strip + simplify ---");
  report(document);

  // 6. Meshopt-compress the final geometry (small bundled wasm decoder,
  // vs. Draco's larger Google-hosted one).
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: "high" }));

  await io.write(OUT, document);

  const { statSync } = await import("node:fs");
  const srcSize = statSync(SRC).size;
  const outSize = statSync(OUT).size;
  console.log(
    `\n${path.basename(SRC)} ${(srcSize / 1048576).toFixed(2)} MB -> ` +
    `${path.basename(OUT)} ${(outSize / 1048576).toFixed(2)} MB ` +
    `(${(100 - (outSize / srcSize) * 100).toFixed(1)}% smaller)`
  );
}

function report(document) {
  const root = document.getRoot();
  let tris = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const count = indices ? indices.getCount() : prim.getAttribute("POSITION").getCount();
      tris += count / 3;
      console.log(
        `  ${prim.getMaterial()?.getName() ?? "(no material)"}: ${Math.round(count / 3)} tris`
      );
    }
  }
  console.log(`  materials: ${root.listMaterials().length}, textures: ${root.listTextures().length}, total tris: ${Math.round(tris)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
