import { describe, expect, test } from "vitest";
import { mountGroup } from "./mountGroup";
import { getMountedGroupState } from "./mutable-state/groups";
import { mockGroup } from "./test/mockGroup";
import { setElementBounds } from "../utils/test/mockBoundingClientRect";

describe("mountGroup autoResize", () => {
  test("preserves pixel size for panels with autoResize=false when group size changes", () => {
    const group = mockGroup(new DOMRect(0, 0, 1000, 50), {
      id: "group",
      orientation: "horizontal"
    });

    group.addPanel(new DOMRect(0, 0, 200, 50), "left", {
      autoResize: false,
      defaultSize: 200
    });
    group.addPanel(new DOMRect(200, 0, 800, 50), "right", {
      defaultSize: 800
    });

    const unmountGroup = mountGroup(group);

    try {
      const initialState = getMountedGroupState("group", true);
      expect(initialState.layout).toEqual({
        "group-left": 20,
        "group-right": 80
      });

      setElementBounds(group.panels[0].element, new DOMRect(0, 0, 200, 50));
      setElementBounds(group.panels[1].element, new DOMRect(200, 0, 1000, 50));
      setElementBounds(group.element, new DOMRect(0, 0, 1200, 50));

      const nextState = getMountedGroupState("group", true);

      expect(nextState.groupSize).toBe(1200);

      const leftSizeInPixels = (nextState.layout["group-left"] / 100) * 1200;
      const rightSizeInPixels = (nextState.layout["group-right"] / 100) * 1200;

      expect(leftSizeInPixels).toBeCloseTo(200, 2);
      expect(rightSizeInPixels).toBeCloseTo(1000, 2);
    } finally {
      unmountGroup();
    }
  });
});
