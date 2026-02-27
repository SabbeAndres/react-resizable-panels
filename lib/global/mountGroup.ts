import type { Layout, RegisteredGroup } from "../components/group/types";
import { assert } from "../utils/assert";
import { calculateAvailableGroupSize } from "./dom/calculateAvailableGroupSize";
import { calculateHitRegions } from "./dom/calculateHitRegions";
import { calculatePanelConstraints } from "./dom/calculatePanelConstraints";
import { onDocumentDoubleClick } from "./event-handlers/onDocumentDoubleClick";
import { onDocumentKeyDown } from "./event-handlers/onDocumentKeyDown";
import { onDocumentPointerDown } from "./event-handlers/onDocumentPointerDown";
import { onDocumentPointerLeave } from "./event-handlers/onDocumentPointerLeave";
import { onDocumentPointerMove } from "./event-handlers/onDocumentPointerMove";
import { onDocumentPointerOut } from "./event-handlers/onDocumentPointerOut";
import { onDocumentPointerUp } from "./event-handlers/onDocumentPointerUp";
import {
  deleteMutableGroup,
  getMountedGroupState,
  updateMountedGroup
} from "./mutable-state/groups";
import type { SeparatorToPanelsMap } from "./mutable-state/types";
import { calculateDefaultLayout } from "./utils/calculateDefaultLayout";
import { formatLayoutNumber } from "./utils/formatLayoutNumber";
import { layoutsEqual } from "./utils/layoutsEqual";
import { notifyPanelOnResize } from "./utils/notifyPanelOnResize";
import { objectsEqual } from "./utils/objectsEqual";
import { validateLayoutKeys } from "./utils/validateLayoutKeys";
import { validatePanelGroupLayout } from "./utils/validatePanelGroupLayout";

const ownerDocumentReferenceCounts = new Map<Document, number>();

export function mountGroup(group: RegisteredGroup) {
  let isMounted = true;

  assert(
    group.element.ownerDocument.defaultView,
    "Cannot register an unmounted Group"
  );

  const ResizeObserver = group.element.ownerDocument.defaultView.ResizeObserver;

  const panelIds = new Set<string>();
  const separatorIds = new Set<string>();

  // Add Panels with onResize callbacks to ResizeObserver
  // Add Group to ResizeObserver also in order to sync % based constraints
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { borderBoxSize, target } = entry;
      if (target === group.element) {
        if (isMounted) {
          const groupSize = calculateAvailableGroupSize({ group });
          if (groupSize === 0) {
            // Can't calculate anything meaningful if the group has a width/height of 0
            // (This could indicate that it's within a hidden subtree)
            return;
          }

          const groupState = getMountedGroupState(group.id);
          if (!groupState) {
            // Not mounted yet
            return;
          }

          // Update non-percentage based constraints
          const nextDerivedPanelConstraints = calculatePanelConstraints(group);

          // Revalidate layout in case constraints have changed or group size changed
          const prevLayout = groupState.defaultLayoutDeferred
            ? calculateDefaultLayout(nextDerivedPanelConstraints)
            : groupState.layout;
          const unsafeLayout = preserveNonAutoResizingPanelSizes({
            group,
            nextGroupSize: groupSize,
            prevGroupSize: groupState.groupSize,
            prevLayout
          });
          const nextLayout = validatePanelGroupLayout({
            layout: unsafeLayout,
            panelConstraints: nextDerivedPanelConstraints
          });

          if (
            !groupState.defaultLayoutDeferred &&
            layoutsEqual(groupState.layout, nextLayout) &&
            objectsEqual(
              groupState.derivedPanelConstraints,
              nextDerivedPanelConstraints
            ) &&
            groupState.groupSize === groupSize
          ) {
            return;
          }

          updateMountedGroup(group, {
            defaultLayoutDeferred: false,
            derivedPanelConstraints: nextDerivedPanelConstraints,
            groupSize,
            layout: nextLayout,
            separatorToPanels: groupState.separatorToPanels
          });
        }
      } else {
        notifyPanelOnResize(group, target as HTMLElement, borderBoxSize);
      }
    }
  });

  resizeObserver.observe(group.element);

  group.panels.forEach((panel) => {
    assert(
      !panelIds.has(panel.id),
      `Panel ids must be unique; id "${panel.id}" was used more than once`
    );

    panelIds.add(panel.id);

    if (panel.onResize) {
      resizeObserver.observe(panel.element);
    }
  });

  const groupSize = calculateAvailableGroupSize({ group });

  // Calculate initial layout for the new Panel configuration
  const derivedPanelConstraints = calculatePanelConstraints(group);
  const panelIdsKey = group.panels.map(({ id }) => id).join(",");

  // Gracefully handle an invalid default layout
  // This could happen when e.g. useDefaultLayout is combined with dynamic Panels
  // In this case the best we can do is ignore the incoming layout
  let defaultLayout: Layout | undefined = group.mutableState.defaultLayout;
  if (defaultLayout) {
    if (!validateLayoutKeys(group.panels, defaultLayout)) {
      defaultLayout = undefined;
    }
  }

  const defaultLayoutUnsafe: Layout =
    group.mutableState.layouts[panelIdsKey] ??
    defaultLayout ??
    calculateDefaultLayout(derivedPanelConstraints);
  const defaultLayoutSafe = validatePanelGroupLayout({
    layout: defaultLayoutUnsafe,
    panelConstraints: derivedPanelConstraints
  });

  const ownerDocument = group.element.ownerDocument;

  ownerDocumentReferenceCounts.set(
    ownerDocument,
    (ownerDocumentReferenceCounts.get(ownerDocument) ?? 0) + 1
  );

  const separatorToPanels: SeparatorToPanelsMap = new Map();
  const hitRegions = calculateHitRegions(group);
  hitRegions.forEach((hitRegion) => {
    if (hitRegion.separator) {
      separatorToPanels.set(hitRegion.separator, hitRegion.panels);
    }
  });

  updateMountedGroup(group, {
    defaultLayoutDeferred: groupSize === 0,
    derivedPanelConstraints,
    groupSize,
    layout: defaultLayoutSafe,
    separatorToPanels
  });

  group.separators.forEach((separator) => {
    assert(
      !separatorIds.has(separator.id),
      `Separator ids must be unique; id "${separator.id}" was used more than once`
    );

    separatorIds.add(separator.id);

    separator.element.addEventListener("keydown", onDocumentKeyDown);
  });

  // If this is the first group to be mounted, initialize event handlers
  if (ownerDocumentReferenceCounts.get(ownerDocument) === 1) {
    ownerDocument.addEventListener("dblclick", onDocumentDoubleClick, true);
    ownerDocument.addEventListener("pointerdown", onDocumentPointerDown, true);
    ownerDocument.addEventListener("pointerleave", onDocumentPointerLeave);
    ownerDocument.addEventListener("pointermove", onDocumentPointerMove);
    ownerDocument.addEventListener("pointerout", onDocumentPointerOut);
    ownerDocument.addEventListener("pointerup", onDocumentPointerUp, true);
  }

  return function unmountGroup() {
    isMounted = false;

    ownerDocumentReferenceCounts.set(
      ownerDocument,
      Math.max(0, (ownerDocumentReferenceCounts.get(ownerDocument) ?? 0) - 1)
    );

    deleteMutableGroup(group);

    group.separators.forEach((separator) => {
      separator.element.removeEventListener("keydown", onDocumentKeyDown);
    });

    // If this was the last group to be mounted, tear down event handlers
    if (!ownerDocumentReferenceCounts.get(ownerDocument)) {
      ownerDocument.removeEventListener(
        "dblclick",
        onDocumentDoubleClick,
        true
      );
      ownerDocument.removeEventListener(
        "pointerdown",
        onDocumentPointerDown,
        true
      );
      ownerDocument.removeEventListener("pointerleave", onDocumentPointerLeave);
      ownerDocument.removeEventListener("pointermove", onDocumentPointerMove);
      ownerDocument.removeEventListener("pointerout", onDocumentPointerOut);
      ownerDocument.removeEventListener("pointerup", onDocumentPointerUp, true);
    }

    resizeObserver.disconnect();
  };
}

function preserveNonAutoResizingPanelSizes({
  group,
  nextGroupSize,
  prevGroupSize,
  prevLayout
}: {
  group: RegisteredGroup;
  nextGroupSize: number;
  prevGroupSize: number;
  prevLayout: Layout;
}) {
  if (prevGroupSize <= 0 || nextGroupSize <= 0 || prevGroupSize === nextGroupSize) {
    return prevLayout;
  }

  let hasFixedPanels = false;
  let fixedPanelsTotalSize = 0;
  let flexiblePanelsTotalPrevSize = 0;

  const fixedPanels = new Map<string, number>();
  const flexiblePanelIds: string[] = [];

  for (const panel of group.panels) {
    const prevPanelSize = prevLayout[panel.id] ?? 0;
    if (panel.panelConstraints.autoResize === false) {
      hasFixedPanels = true;

      const prevPanelSizeInPixels = (prevPanelSize / 100) * prevGroupSize;
      const nextPanelSize = formatLayoutNumber(
        (prevPanelSizeInPixels / nextGroupSize) * 100
      );

      fixedPanels.set(panel.id, nextPanelSize);
      fixedPanelsTotalSize += nextPanelSize;
    } else {
      flexiblePanelIds.push(panel.id);
      flexiblePanelsTotalPrevSize += prevPanelSize;
    }
  }

  if (!hasFixedPanels || flexiblePanelIds.length === 0) {
    return prevLayout;
  }

  const remainingSize = 100 - fixedPanelsTotalSize;
  const nextLayout = { ...prevLayout };

  fixedPanels.forEach((size, panelId) => {
    nextLayout[panelId] = size;
  });

  if (flexiblePanelsTotalPrevSize > 0) {
    for (const panelId of flexiblePanelIds) {
      const prevSize = prevLayout[panelId] ?? 0;
      nextLayout[panelId] = formatLayoutNumber(
        (prevSize / flexiblePanelsTotalPrevSize) * remainingSize
      );
    }
  } else {
    const evenSize = formatLayoutNumber(remainingSize / flexiblePanelIds.length);
    for (const panelId of flexiblePanelIds) {
      nextLayout[panelId] = evenSize;
    }
  }

  return nextLayout;
}
