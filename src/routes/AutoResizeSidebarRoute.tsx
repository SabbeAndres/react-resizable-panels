import { Box, Header } from "react-lib-tools";
import { Group } from "../components/styled-panels/Group";
import { Panel } from "../components/styled-panels/Panel";
import { Separator } from "../components/styled-panels/Separator";

export default function AutoResizeSidebarRoute() {
  return (
    <Box direction="column" gap={4}>
      <Header section="Examples" title="Fixed sidebar panel" />
      <div>
        Use <code>autoResize=&#123;false&#125;</code> on a sidebar panel to keep
        its pixel size stable when the browser or container resizes.
      </div>
      <Group>
        <Panel autoResize={false} defaultSize={280} maxSize={420} minSize={200} showSizeInPixels>
          left sidebar
        </Panel>
        <Separator />
        <Panel showSizeInPixels>main content</Panel>
      </Group>
      <div>
        Try resizing the window: the left panel stays around the same pixel
        width while the right panel absorbs the remaining space.
      </div>
    </Box>
  );
}