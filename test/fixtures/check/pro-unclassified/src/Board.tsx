import {
  EmptyState,
  Kanban,
} from "@heroui-pro/react";
import type { KpiGroupProps } from "@heroui-pro/react";
import { Button } from "@heroui/react";

export function Board(_: KpiGroupProps) {
  return <Kanban><EmptyState /><Button /></Kanban>;
}
