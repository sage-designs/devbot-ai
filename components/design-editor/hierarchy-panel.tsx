import { useState } from 'react';
import { useEditorStore } from '@/lib/design-editor/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { 
  ChevronRightIcon, 
  ChevronDownIcon, 
  EyeIcon, 
  EyeOffIcon, 
  LockIcon, 
  UnlockIcon,
  CopyIcon,
  TrashIcon
} from '@/components/icons';
import { cn } from '@/lib/utils';

export function HierarchyPanel() {
  const {
    objects,
    rootObjects,
    selectedIds,
    selectObject,
    updateObject,
    deleteObject,
    duplicateObject,
    moveObject,
  } = useEditorStore();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleNameEdit = (id: string, newName: string) => {
    updateObject(id, { name: newName });
    setEditingId(null);
  };

  const renderObject = (objectId: string, depth: number = 0) => {
    const object = objects[objectId];
    if (!object) return null;

    const isSelected = selectedIds.includes(objectId);
    const isExpanded = expandedIds.has(objectId);
    const hasChildren = object.children.length > 0;
    const isEditing = editingId === objectId;

    return (
      <div key={objectId}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-muted/50 select-none",
                isSelected && "bg-accent text-accent-foreground",
                object.locked && "opacity-60"
              )}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={(e) => {
                const multi = e.shiftKey || e.ctrlKey || e.metaKey;
                selectObject(objectId, multi);
              }}
            >
              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) toggleExpanded(objectId);
                }}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDownIcon size={12} />
                  ) : (
                    <ChevronRightIcon size={12} />
                  )
                ) : (
                  <div className="w-3" />
                )}
              </Button>

              {/* Object Type Icon */}
              <div className="w-4 h-4 flex items-center justify-center">
                <ObjectTypeIcon type={object.type} />
              </div>

              {/* Object Name */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={object.name}
                    onChange={(e) => updateObject(objectId, { name: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingId(null);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="h-6 text-xs"
                    autoFocus
                  />
                ) : (
                  <span
                    className="truncate block"
                    onDoubleClick={() => setEditingId(objectId)}
                  >
                    {object.name}
                  </span>
                )}
              </div>

              {/* Visibility Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  updateObject(objectId, { 
                    appearance: { ...object.appearance, visible: !object.appearance.visible }
                  });
                }}
              >
                {object.appearance.visible ? (
                  <EyeIcon size={12} />
                ) : (
                  <EyeOffIcon size={12} />
                )}
              </Button>

              {/* Lock Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  updateObject(objectId, { locked: !object.locked });
                }}
              >
                {object.locked ? (
                  <LockIcon size={12} />
                ) : (
                  <UnlockIcon size={12} />
                )}
              </Button>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem onClick={() => setEditingId(objectId)}>
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => duplicateObject(objectId)}>
              <CopyIcon size={14} className="mr-2" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => deleteObject(objectId)}
              className="text-destructive"
            >
              <TrashIcon size={14} className="mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {object.children.map(childId => 
              renderObject(childId, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">Layers</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {rootObjects.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No objects in scene
            </div>
          ) : (
            rootObjects.map(objectId => renderObject(objectId))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ObjectTypeIcon({ type }: { type: string }) {
  const iconClass = "w-3 h-3";
  
  switch (type) {
    case 'sprite':
      return <div className={cn(iconClass, "bg-green-500 rounded")} />;
    case 'graphics':
      return <div className={cn(iconClass, "bg-blue-500 rounded")} />;
    case 'text':
      return <div className={cn(iconClass, "bg-purple-500 rounded")} style={{ fontSize: '8px' }}>T</div>;
    case 'container':
      return <div className={cn(iconClass, "bg-orange-500 rounded")} />;
    case 'animatedSprite':
      return <div className={cn(iconClass, "bg-red-500 rounded")} />;
    case 'tilingSprite':
      return <div className={cn(iconClass, "bg-teal-500 rounded")} />;
    default:
      return <div className={cn(iconClass, "bg-gray-500 rounded")} />;
  }
}
