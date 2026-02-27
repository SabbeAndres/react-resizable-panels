import { Box, Callout, Header } from "react-lib-tools";
import { useDefaultLayout } from "react-resizable-panels";
import { Group } from "../components/styled-panels/Group";
import { Panel } from "../components/styled-panels/Panel";
import { Separator } from "../components/styled-panels/Separator";

export default function PersistentFixedSidebarRoute() {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "persistent-fixed-sidebar-layout",
    storage: localStorage
  });

  return (
    <Box direction="column" gap={4}>
      <Header
        section="Examples"
        title="Persistent layout with fixed sidebar panel"
      />
      <div>
        This example combines persisted layouts with
        <code> autoResize=&#123;false&#125; </code> on the sidebar panel.
      </div>
      <div>
        Resize panels, reload the page, and the last layout will be restored.
      </div>
      <Group
        className="h-15"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <Panel
          autoResize={false}
          defaultSize={280}
          id="sidebar"
          maxSize={420}
          minSize={200}
          showSizeInPixels
        >
          left sidebar
        </Panel>
        <Separator />
        <Panel id="content" showSizeInPixels>
          main content
        </Panel>
      </Group>
      <Callout intent="warning">
        Panels require unique <code>id</code> props for persisted layouts.
      </Callout>
    </Box>
  );
}