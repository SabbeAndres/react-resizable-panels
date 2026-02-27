import { Group, Panel, Separator } from "react-resizable-panels";

export default function AutoResizeSidebar() {
  return (
    <Group>
      <Panel autoResize={false} defaultSize={280} minSize={200} maxSize={420}>
        left sidebar
      </Panel>
      <Separator />
      <Panel defaultSize="100%">main content</Panel>
    </Group>
  );
}
