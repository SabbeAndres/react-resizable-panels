import { Box, Code, Header } from "react-lib-tools";
import { html as ExampleHTML } from "../../public/generated/examples/FixedSidebar.json";
import { Group } from "../components/styled-panels/Group";
import { Panel } from "../components/styled-panels/Panel";
import { Separator } from "../components/styled-panels/Separator";

export default function FixedSidebarRoute() {
  return (
    <Box direction="column" gap={4}>
      <Header section="Examples" title="Fixed sidebar panel" />
      <div>
        Use <code>groupResizeBehavior=&quot;fixed&quot;</code> on a sidebar
        panel to keep its pixel size stable when the browser or container
        resizes.
      </div>
      <Code html={ExampleHTML} />
      <Group>
        <Panel
          groupResizeBehavior="fixed"
          defaultSize={280}
          maxSize={420}
          minSize={200}
          showSizeInPixels
        >
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
