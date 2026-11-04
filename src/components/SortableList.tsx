import type { ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HandleProps = Record<string, any>

function SortableItem({ id, render }: { id: string; render: (handle: HandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {render({ ...attributes, ...listeners })}
    </div>
  )
}

export default function SortableList<T extends { id: string; sort_order: number }>({
  items,
  onReorder,
  render,
}: {
  items: T[]
  onReorder: (id: string, newOrder: number) => void
  render: (item: T, handle: HandleProps) => ReactNode
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    const moved = arrayMove(items, from, to)
    const prev = moved[to - 1]?.sort_order
    const next = moved[to + 1]?.sort_order
    let order: number
    if (prev === undefined && next === undefined) return
    else if (prev === undefined) order = (next as number) - 1000
    else if (next === undefined) order = prev + 1000
    else order = (prev + next) / 2
    onReorder(String(active.id), order)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id} render={(handle) => render(item, handle)} />
        ))}
      </SortableContext>
    </DndContext>
  )
}