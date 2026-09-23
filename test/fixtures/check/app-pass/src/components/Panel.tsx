import { Button, Card } from "@heroui/react";
import { Sidebar, useSidebar, type SidebarProps } from "@heroui-pro/react";
import { EmptyState } from "@heroui-pro/react/empty-state";
import type { KanbanProps } from "@heroui-pro/react";

export function Panel(props: SidebarProps & { k?: KanbanProps }) {
  const { open } = useSidebar();
  return (
    <Card className="rounded-card">
      <Sidebar {...props} />
      <EmptyState />
      {/* shape-exempt: OG image rendered by Satori, no stylesheet */}
      <div style={{ borderRadius: 12 }} />
      <span style={{ borderRadius: 4 }} /> {/* shape-exempt: test cursor */}
      <Button className="rounded-control">{open ? "close" : "open"}</Button>
    </Card>
  );
}
