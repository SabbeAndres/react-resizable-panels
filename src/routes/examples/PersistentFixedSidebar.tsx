import {
  Group,
  Panel,
  Separator,
  useDefaultLayout
} from "react-resizable-panels";

// <begin>

// eslint-disable-next-line react-hooks/rules-of-hooks
const { defaultLayout, onLayoutChanged } = useDefaultLayout({
  id: "persistent-fixed-sidebar-layout",
  storage: localStorage
});

/* prettier-ignore */
<Group defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
  <Panel id="sidebar" autoResize={false} defaultSize={280} minSize={200} maxSize={420}>
    left sidebar
  </Panel>
  <Separator />
  <Panel id="content">main content</Panel>
</Group>
