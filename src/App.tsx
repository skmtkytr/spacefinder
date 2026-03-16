import React, { useState, useCallback } from "react";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { Breadcrumb } from "./components/Breadcrumb/Breadcrumb";
import { Treemap } from "./components/Treemap/Treemap";
import { StatusBar } from "./components/StatusBar/StatusBar";
import { ContextMenu } from "./components/ContextMenu/ContextMenu";
import type { FileNode } from "./types/fileTree";

const App: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode;
    x: number;
    y: number;
  } | null>(null);

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

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <Toolbar />
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
