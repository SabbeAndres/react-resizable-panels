import { Group, Panel, Separator } from "react-resizable-panels";

// <begin>

/* prettier-ignore */
<Group>
  <Panel
    groupResizeBehavior="fixed"
    defaultSize={280}
    minSize={200}
    maxSize={420}
  >
    left sidebar
  </Panel>
  <Separator />
  <Panel>main content</Panel>
</Group>
