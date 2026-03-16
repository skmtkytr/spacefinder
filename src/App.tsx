import React, { useState, useCallback, useMemo, useRef } from "react";
import { Toolbar, type ToolbarHandle } from "./components/Toolbar/Toolbar";
import { Breadcrumb } from "./components/Breadcrumb/Breadcrumb";
import { Treemap } from "./components/Treemap/Treemap";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { ContextMenu } from "./components/ContextMenu/ContextMenu";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useScanner } from "./hooks/useScanner";
import { useAppStore } from "./store/appStore";
import type { FileNode } from "./types/fileTree";

const App: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode;
    x: number;
    y: number;
  } | null>(null);

  const { openAndScan, rescan } = useScanner();
  const { navigateUp, navigateToIndex } = useAppStore();
  const toolbarRef = useRef<ToolbarHandle>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FileNode) => {
      e.preventDefault();
      setContextMenu({ node, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const shortcuts = useMemo(
    () => ({
      navigateUp,
      openAndScan,
      rescan,
      toggleFilter: () => toolbarRef.current?.toggleFilters(),
      closeContextMenu,
      navigateToRoot: () => navigateToIndex(0),
    }),
    [navigateUp, openAndScan, rescan, closeContextMenu, navigateToIndex],
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <Toolbar ref={toolbarRef} />
      <Breadcrumb />
      <Treemap onContextMenu={handleContextMenu} />
      <StatusBar />
      {contextMenu && (
        <ContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default App;
