"use client";

import { PitchScene } from "./PitchScene";
import { PitchBoard } from "./PitchBoard";
import { FormationRow } from "./FormationRow";
import { StaffBench } from "./StaffBench";
import { CaptainsRow } from "./CaptainsRow";
import { FORMATION_CONFIG } from "./formation-config";
import type { SquadPlayer, SquadPosition, StaffMember } from "@/lib/squad";

type ActiveRow = SquadPosition | "Staff" | "Capitans" | "Tots" | null;

export function Pitch3DView({
  activeRow,
  detailedId,
  rowData,
  staffMembers,
  captains,
  toggleRow,
  toggleDetail,
  closeDetail,
}: {
  activeRow: ActiveRow;
  detailedId: string | null;
  rowData: Record<SquadPosition, SquadPlayer[]>;
  staffMembers: StaffMember[];
  captains: SquadPlayer[];
  toggleRow: (target: Exclude<ActiveRow, null>) => void;
  toggleDetail: (id: string) => void;
  closeDetail: () => void;
}) {
  return (
    <PitchScene onBackgroundClick={closeDetail}>
      <PitchBoard />
      {FORMATION_CONFIG.map((config) => (
        <FormationRow
          key={config.position}
          config={config}
          allPlayers={rowData[config.position]}
          isActive={activeRow === config.position || activeRow === "Tots"}
          isDimmed={activeRow !== null && activeRow !== "Tots" && activeRow !== config.position}
          onToggleActive={() => toggleRow(config.position)}
          detailedId={detailedId}
          onToggleDetail={toggleDetail}
        />
      ))}
      <StaffBench
        staff={staffMembers}
        isActive={activeRow === "Staff" || activeRow === "Tots"}
        isDimmed={activeRow !== null && activeRow !== "Tots" && activeRow !== "Staff"}
        onToggleActive={() => toggleRow("Staff")}
        detailedId={detailedId}
        onToggleDetail={toggleDetail}
      />
      <CaptainsRow
        captains={captains}
        isActive={activeRow === "Capitans"}
        detailedId={detailedId}
        onToggleDetail={toggleDetail}
      />
    </PitchScene>
  );
}
